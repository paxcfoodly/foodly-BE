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
const ALLOWED_FIELDS = ['workshop_cd', 'workshop_nm', 'plant_cd', 'workshop_type', 'parent_cd', 'use_yn'];

const workshopSelect = {
  workshop_cd: true,
  workshop_nm: true,
  plant_cd: true,
  parent_cd: true,
  workshop_type: true,
  sort_order: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listWorkshops(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, workshops] = await Promise.all([
    prisma.tbWorkshop.count({ where: where as any }),
    prisma.tbWorkshop.findMany({
      where: where as any,
      select: workshopSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ workshop_cd: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(workshops, total, page, limit);
}

// ─── Get by ID ───

export async function getWorkshopById(workshopCd: string) {
  const workshop = await prisma.tbWorkshop.findUnique({
    where: { workshop_cd: workshopCd },
    select: workshopSelect,
  });
  if (!workshop) throw new AppError('존재하지 않는 작업장입니다.', 404);
  return workshop;
}

// ─── Create ───

export interface WorkshopCreateInput {
  workshop_cd: string;
  workshop_nm: string;
  plant_cd: string;
  parent_cd?: string | null;
  workshop_type?: string | null;
  sort_order?: number;
  use_yn?: string;
}

export async function createWorkshop(input: WorkshopCreateInput, userId?: string) {
  const existing = await prisma.tbWorkshop.findUnique({ where: { workshop_cd: input.workshop_cd } });
  if (existing) throw new AppError('이미 존재하는 작업장코드입니다.', 409);

  const workshop = await prisma.tbWorkshop.create({
    data: {
      workshop_cd: input.workshop_cd,
      workshop_nm: input.workshop_nm,
      plant_cd: input.plant_cd,
      parent_cd: input.parent_cd ?? null,
      workshop_type: input.workshop_type ?? null,
      sort_order: input.sort_order ?? 0,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: workshopSelect,
  });
  return workshop;
}

// ─── Update (with data history) ───

export interface WorkshopUpdateInput {
  workshop_nm?: string;
  plant_cd?: string;
  parent_cd?: string | null;
  workshop_type?: string | null;
  sort_order?: number;
  use_yn?: string;
}

export async function updateWorkshop(workshopCd: string, input: WorkshopUpdateInput, userId?: string) {
  const existing = await prisma.tbWorkshop.findUnique({ where: { workshop_cd: workshopCd }, select: workshopSelect });
  if (!existing) throw new AppError('존재하지 않는 작업장입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.workshop_nm !== undefined) data.workshop_nm = input.workshop_nm;
  if (input.plant_cd !== undefined) data.plant_cd = input.plant_cd;
  if (input.parent_cd !== undefined) data.parent_cd = input.parent_cd;
  if (input.workshop_type !== undefined) data.workshop_type = input.workshop_type;
  if (input.sort_order !== undefined) data.sort_order = input.sort_order;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbWorkshop.update({
    where: { workshop_cd: workshopCd },
    data: data as any,
    select: workshopSelect,
  });

  const before: Record<string, unknown> = { ...existing };
  const after: Record<string, unknown> = { ...updated };
  logDataChanges('tb_workshop', workshopCd, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteWorkshop(workshopCd: string) {
  const existing = await prisma.tbWorkshop.findUnique({ where: { workshop_cd: workshopCd } });
  if (!existing) throw new AppError('존재하지 않는 작업장입니다.', 404);

  try {
    await prisma.tbWorkshop.delete({ where: { workshop_cd: workshopCd } });
    return { message: '작업장이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Bulk Import (Excel) ───

const IMPORT_COLUMN_MAP: ColumnMap = {
  '작업장코드': { field: 'workshop_cd', required: true },
  '작업장명':   { field: 'workshop_nm', required: true },
  '공장코드':   { field: 'plant_cd', required: true },
  '상위작업장': { field: 'parent_cd' },
  '작업장유형': { field: 'workshop_type' },
  '정렬순서':   { field: 'sort_order', type: 'number' },
  '사용여부':   { field: 'use_yn' },
};

interface ImportRow {
  workshop_cd: string;
  workshop_nm: string;
  plant_cd: string;
  parent_cd?: string | null;
  workshop_type?: string | null;
  sort_order?: number | null;
  use_yn?: string | null;
}

export async function bulkImportWorkshops(buffer: Buffer, userId?: string) {
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

      await prisma.tbWorkshop.upsert({
        where: { workshop_cd: row.workshop_cd },
        create: {
          workshop_cd: row.workshop_cd,
          workshop_nm: row.workshop_nm,
          plant_cd: row.plant_cd,
          parent_cd: row.parent_cd ?? null,
          workshop_type: row.workshop_type ?? null,
          sort_order: row.sort_order ?? 0,
          use_yn: row.use_yn ?? 'Y',
          create_by: userId ?? null,
          update_by: userId ?? null,
        },
        update: {
          workshop_nm: row.workshop_nm,
          plant_cd: row.plant_cd,
          parent_cd: row.parent_cd ?? null,
          workshop_type: row.workshop_type ?? null,
          sort_order: row.sort_order ?? 0,
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
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '작업장명',   key: 'workshop_nm', width: 25 },
  { header: '공장코드',   key: 'plant_cd', width: 12 },
  { header: '상위작업장', key: 'parent_cd', width: 15 },
  { header: '작업장유형', key: 'workshop_type', width: 12 },
  { header: '정렬순서',   key: 'sort_order', width: 8 },
  { header: '사용여부',   key: 'use_yn', width: 8 },
  { header: '등록자',     key: 'create_by', width: 12 },
  { header: '등록일시',   key: 'create_dt', width: 18 },
  { header: '수정자',     key: 'update_by', width: 12 },
  { header: '수정일시',   key: 'update_dt', width: 18 },
];

export async function exportWorkshops(req: Request, res: Response) {
  const where = parseFilters(req, ALLOWED_FIELDS);

  const workshops = await prisma.tbWorkshop.findMany({
    where: where as any,
    select: workshopSelect,
    orderBy: { workshop_cd: 'asc' },
  });

  await exportToExcel(res, EXPORT_COLUMNS, workshops as any[], '작업장목록');
}
