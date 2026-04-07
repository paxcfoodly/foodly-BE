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
const ALLOWED_FIELDS = ['mold_cd', 'mold_nm', 'item_cd', 'use_yn'];

const moldSelect = {
  mold_cd: true,
  mold_nm: true,
  item_cd: true,
  warranty_shots: true,
  current_shots: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listMolds(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, molds] = await Promise.all([
    prisma.tbMold.count({ where: where as any }),
    prisma.tbMold.findMany({
      where: where as any,
      select: moldSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ mold_cd: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(molds, total, page, limit);
}

// ─── Get by ID ───

export async function getMoldById(moldCd: string) {
  const mold = await prisma.tbMold.findUnique({
    where: { mold_cd: moldCd },
    select: moldSelect,
  });
  if (!mold) throw new AppError('존재하지 않는 금형입니다.', 404);
  return mold;
}

// ─── Create ───

export interface MoldCreateInput {
  mold_cd: string;
  mold_nm: string;
  item_cd?: string | null;
  warranty_shots?: number | null;
  current_shots?: number;
  use_yn?: string;
}

export async function createMold(input: MoldCreateInput, userId?: string) {
  const existing = await prisma.tbMold.findUnique({ where: { mold_cd: input.mold_cd } });
  if (existing) throw new AppError('이미 존재하는 금형코드입니다.', 409);

  const mold = await prisma.tbMold.create({
    data: {
      mold_cd: input.mold_cd,
      mold_nm: input.mold_nm,
      item_cd: input.item_cd ?? null,
      warranty_shots: input.warranty_shots ?? null,
      current_shots: input.current_shots ?? 0,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: moldSelect,
  });
  return mold;
}

// ─── Update (with data history) ───

export interface MoldUpdateInput {
  mold_nm?: string;
  item_cd?: string | null;
  warranty_shots?: number | null;
  current_shots?: number;
  use_yn?: string;
}

export async function updateMold(moldCd: string, input: MoldUpdateInput, userId?: string) {
  const existing = await prisma.tbMold.findUnique({ where: { mold_cd: moldCd }, select: moldSelect });
  if (!existing) throw new AppError('존재하지 않는 금형입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.mold_nm !== undefined) data.mold_nm = input.mold_nm;
  if (input.item_cd !== undefined) data.item_cd = input.item_cd;
  if (input.warranty_shots !== undefined) data.warranty_shots = input.warranty_shots;
  if (input.current_shots !== undefined) data.current_shots = input.current_shots;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbMold.update({
    where: { mold_cd: moldCd },
    data: data as any,
    select: moldSelect,
  });

  const before: Record<string, unknown> = { ...existing };
  const after: Record<string, unknown> = { ...updated };
  logDataChanges('tb_mold', moldCd, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteMold(moldCd: string) {
  const existing = await prisma.tbMold.findUnique({ where: { mold_cd: moldCd } });
  if (!existing) throw new AppError('존재하지 않는 금형입니다.', 404);

  try {
    await prisma.tbMold.delete({ where: { mold_cd: moldCd } });
    return { message: '금형이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Bulk Import (Excel) ───

const IMPORT_COLUMN_MAP: ColumnMap = {
  '금형코드': { field: 'mold_cd', required: true },
  '금형명':   { field: 'mold_nm', required: true },
  '적용품목': { field: 'item_cd' },
  '보증타수': { field: 'warranty_shots', type: 'number' },
  '현재타수': { field: 'current_shots', type: 'number' },
  '사용여부': { field: 'use_yn' },
};

interface ImportRow {
  mold_cd: string;
  mold_nm: string;
  item_cd?: string | null;
  warranty_shots?: number | null;
  current_shots?: number | null;
  use_yn?: string | null;
}

export async function bulkImportMolds(buffer: Buffer, userId?: string) {
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
      if (row.use_yn && !['Y', 'N'].includes(row.use_yn)) {
        rowErrors.push({ row: i + 2, column: 'use_yn', message: '사용여부는 Y 또는 N만 가능합니다.' });
        errorCount++;
        continue;
      }

      await prisma.tbMold.upsert({
        where: { mold_cd: row.mold_cd },
        create: {
          mold_cd: row.mold_cd,
          mold_nm: row.mold_nm,
          item_cd: row.item_cd ?? null,
          warranty_shots: row.warranty_shots ?? null,
          current_shots: row.current_shots ?? 0,
          use_yn: row.use_yn ?? 'Y',
          create_by: userId ?? null,
          update_by: userId ?? null,
        },
        update: {
          mold_nm: row.mold_nm,
          item_cd: row.item_cd ?? null,
          warranty_shots: row.warranty_shots ?? null,
          current_shots: row.current_shots ?? 0,
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
  { header: '금형코드', key: 'mold_cd', width: 15 },
  { header: '금형명',   key: 'mold_nm', width: 25 },
  { header: '적용품목', key: 'item_cd', width: 15 },
  { header: '보증타수', key: 'warranty_shots', width: 10 },
  { header: '현재타수', key: 'current_shots', width: 10 },
  { header: '사용여부', key: 'use_yn', width: 8 },
  { header: '등록자',   key: 'create_by', width: 12 },
  { header: '등록일시', key: 'create_dt', width: 18 },
  { header: '수정자',   key: 'update_by', width: 12 },
  { header: '수정일시', key: 'update_dt', width: 18 },
];

export async function exportMolds(req: Request, res: Response) {
  const where = parseFilters(req, ALLOWED_FIELDS);

  const molds = await prisma.tbMold.findMany({
    where: where as any,
    select: moldSelect,
    orderBy: { mold_cd: 'asc' },
  });

  await exportToExcel(res, EXPORT_COLUMNS, molds as any[], '금형목록');
}
