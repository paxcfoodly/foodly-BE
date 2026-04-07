import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logDataChanges } from './dataHistoryService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
  parseExcelUpload,
  exportToExcel,
} from '../utils';
import type { ColumnMap, ExcelColumn } from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['item_cd', 'item_nm', 'item_type', 'use_yn'];

const itemSelect = {
  item_cd: true,
  item_nm: true,
  item_type: true,
  unit_cd: true,
  spec: true,
  drawing_no: true,
  safety_stock: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listItems(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, items] = await Promise.all([
    prisma.tbItem.count({ where: where as any }),
    prisma.tbItem.findMany({
      where: where as any,
      select: itemSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ item_cd: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(items, total, page, limit);
}

// ─── Get by ID ───

export async function getItemById(itemCd: string) {
  const item = await prisma.tbItem.findUnique({
    where: { item_cd: itemCd },
    select: itemSelect,
  });
  if (!item) throw new AppError('존재하지 않는 품목입니다.', 404);
  return item;
}

// ─── Create ───

export interface ItemCreateInput {
  item_cd: string;
  item_nm: string;
  item_type: string;
  unit_cd?: string | null;
  spec?: string | null;
  drawing_no?: string | null;
  safety_stock?: number | null;
  use_yn?: string;
}

export async function createItem(input: ItemCreateInput, userId?: string) {
  const existing = await prisma.tbItem.findUnique({ where: { item_cd: input.item_cd } });
  if (existing) throw new AppError('이미 존재하는 품목코드입니다.', 409);

  const item = await prisma.tbItem.create({
    data: {
      item_cd: input.item_cd,
      item_nm: input.item_nm,
      item_type: input.item_type,
      unit_cd: input.unit_cd ?? null,
      spec: input.spec ?? null,
      drawing_no: input.drawing_no ?? null,
      safety_stock: input.safety_stock ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: itemSelect,
  });
  return item;
}

// ─── Update (with data history) ───

export interface ItemUpdateInput {
  item_nm?: string;
  item_type?: string;
  unit_cd?: string | null;
  spec?: string | null;
  drawing_no?: string | null;
  safety_stock?: number | null;
  use_yn?: string;
}

export async function updateItem(itemCd: string, input: ItemUpdateInput, userId?: string) {
  const existing = await prisma.tbItem.findUnique({ where: { item_cd: itemCd }, select: itemSelect });
  if (!existing) throw new AppError('존재하지 않는 품목입니다.', 404);

  // Build update data — only provided fields
  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.item_nm !== undefined) data.item_nm = input.item_nm;
  if (input.item_type !== undefined) data.item_type = input.item_type;
  if (input.unit_cd !== undefined) data.unit_cd = input.unit_cd;
  if (input.spec !== undefined) data.spec = input.spec;
  if (input.drawing_no !== undefined) data.drawing_no = input.drawing_no;
  if (input.safety_stock !== undefined) data.safety_stock = input.safety_stock;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbItem.update({
    where: { item_cd: itemCd },
    data: data as any,
    select: itemSelect,
  });

  // Log data changes (non-blocking)
  const before: Record<string, unknown> = { ...existing, safety_stock: existing.safety_stock != null ? Number(existing.safety_stock) : null };
  const after: Record<string, unknown> = { ...updated, safety_stock: updated.safety_stock != null ? Number(updated.safety_stock) : null };
  logDataChanges('tb_item', itemCd, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteItem(itemCd: string) {
  const existing = await prisma.tbItem.findUnique({ where: { item_cd: itemCd } });
  if (!existing) throw new AppError('존재하지 않는 품목입니다.', 404);

  try {
    await prisma.tbItem.delete({ where: { item_cd: itemCd } });
    return { message: '품목이 삭제되었습니다.' };
  } catch (err: any) {
    // Prisma FK constraint violation
    if (err?.code === 'P2003') {
      throw new AppError('다른 데이터에서 참조 중이므로 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Bulk Import (Excel) ───

const IMPORT_COLUMN_MAP: ColumnMap = {
  '품목코드': { field: 'item_cd', required: true },
  '품목명':   { field: 'item_nm', required: true },
  '품목유형': { field: 'item_type', required: true },
  '단위':     { field: 'unit_cd' },
  '규격':     { field: 'spec' },
  '도면번호': { field: 'drawing_no' },
  '안전재고': { field: 'safety_stock', type: 'number' },
  '사용여부': { field: 'use_yn' },
};

interface ImportRow {
  item_cd: string;
  item_nm: string;
  item_type: string;
  unit_cd?: string | null;
  spec?: string | null;
  drawing_no?: string | null;
  safety_stock?: number | null;
  use_yn?: string | null;
}

export async function bulkImportItems(buffer: Buffer, userId?: string) {
  const { data, errors } = await parseExcelUpload<ImportRow>(buffer, IMPORT_COLUMN_MAP);

  if (data.length === 0 && errors.length === 0) {
    throw new AppError('엑셀 파일에 데이터가 없습니다.', 400);
  }

  let successCount = 0;
  let errorCount = errors.length;
  const rowErrors = [...errors];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Validate item_type
      if (!['RAW', 'SEMI', 'FIN'].includes(row.item_type)) {
        rowErrors.push({ row: i + 2, column: 'item_type', message: '품목유형은 RAW, SEMI, FIN 중 하나여야 합니다.' });
        errorCount++;
        continue;
      }

      // Validate use_yn if provided
      if (row.use_yn && !['Y', 'N'].includes(row.use_yn)) {
        rowErrors.push({ row: i + 2, column: 'use_yn', message: '사용여부는 Y 또는 N만 가능합니다.' });
        errorCount++;
        continue;
      }

      await prisma.tbItem.upsert({
        where: { item_cd: row.item_cd },
        create: {
          item_cd: row.item_cd,
          item_nm: row.item_nm,
          item_type: row.item_type,
          unit_cd: row.unit_cd ?? null,
          spec: row.spec ?? null,
          drawing_no: row.drawing_no ?? null,
          safety_stock: row.safety_stock ?? null,
          use_yn: row.use_yn ?? 'Y',
          create_by: userId ?? null,
          update_by: userId ?? null,
        },
        update: {
          item_nm: row.item_nm,
          item_type: row.item_type,
          unit_cd: row.unit_cd ?? null,
          spec: row.spec ?? null,
          drawing_no: row.drawing_no ?? null,
          safety_stock: row.safety_stock ?? null,
          use_yn: row.use_yn ?? 'Y',
          update_by: userId ?? null,
          update_dt: new Date(),
        },
      });
      successCount++;
    } catch (err: any) {
      rowErrors.push({ row: i + 2, column: '-', message: err.message ?? '알 수 없는 오류' });
      errorCount++;
    }
  }

  return { totalRows: data.length, successCount, errorCount, errors: rowErrors };
}

// ─── Export (Excel) ───

const EXPORT_COLUMNS: ExcelColumn[] = [
  { header: '품목코드', key: 'item_cd', width: 15 },
  { header: '품목명',   key: 'item_nm', width: 25 },
  { header: '품목유형', key: 'item_type', width: 10 },
  { header: '단위',     key: 'unit_cd', width: 8 },
  { header: '규격',     key: 'spec', width: 20 },
  { header: '도면번호', key: 'drawing_no', width: 15 },
  { header: '안전재고', key: 'safety_stock', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 8 },
  { header: '등록자',   key: 'create_by', width: 12 },
  { header: '등록일시', key: 'create_dt', width: 18 },
  { header: '수정자',   key: 'update_by', width: 12 },
  { header: '수정일시', key: 'update_dt', width: 18 },
];

export async function exportItems(req: Request, res: Response) {
  const where = parseFilters(req, ALLOWED_FIELDS);

  const items = await prisma.tbItem.findMany({
    where: where as any,
    select: itemSelect,
    orderBy: { item_cd: 'asc' },
  });

  await exportToExcel(res, EXPORT_COLUMNS, items as any[], '품목목록');
}
