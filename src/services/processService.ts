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
const ALLOWED_FIELDS = ['process_cd', 'process_nm', 'process_type', 'use_yn'];

const processSelect = {
  process_cd: true,
  process_nm: true,
  process_type: true,
  std_time: true,
  workshop_cd: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listProcesses(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, processes] = await Promise.all([
    prisma.tbProcess.count({ where: where as any }),
    prisma.tbProcess.findMany({
      where: where as any,
      select: processSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ process_cd: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(processes, total, page, limit);
}

// ─── Get by ID ───

export async function getProcessById(processCd: string) {
  const process = await prisma.tbProcess.findUnique({
    where: { process_cd: processCd },
    select: processSelect,
  });
  if (!process) throw new AppError('존재하지 않는 공정입니다.', 404);
  return process;
}

// ─── Create ───

export interface ProcessCreateInput {
  process_cd: string;
  process_nm: string;
  process_type?: string | null;
  std_time?: number | null;
  workshop_cd?: string | null;
  use_yn?: string;
}

export async function createProcess(input: ProcessCreateInput, userId?: string) {
  const existing = await prisma.tbProcess.findUnique({ where: { process_cd: input.process_cd } });
  if (existing) throw new AppError('이미 존재하는 공정코드입니다.', 409);

  const process = await prisma.tbProcess.create({
    data: {
      process_cd: input.process_cd,
      process_nm: input.process_nm,
      process_type: input.process_type ?? null,
      std_time: input.std_time ?? null,
      workshop_cd: input.workshop_cd ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: processSelect,
  });
  return process;
}

// ─── Update (with data history) ───

export interface ProcessUpdateInput {
  process_nm?: string;
  process_type?: string | null;
  std_time?: number | null;
  workshop_cd?: string | null;
  use_yn?: string;
}

export async function updateProcess(processCd: string, input: ProcessUpdateInput, userId?: string) {
  const existing = await prisma.tbProcess.findUnique({ where: { process_cd: processCd }, select: processSelect });
  if (!existing) throw new AppError('존재하지 않는 공정입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.process_nm !== undefined) data.process_nm = input.process_nm;
  if (input.process_type !== undefined) data.process_type = input.process_type;
  if (input.std_time !== undefined) data.std_time = input.std_time;
  if (input.workshop_cd !== undefined) data.workshop_cd = input.workshop_cd;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbProcess.update({
    where: { process_cd: processCd },
    data: data as any,
    select: processSelect,
  });

  // Log data changes (non-blocking)
  const before: Record<string, unknown> = { ...existing, std_time: existing.std_time != null ? Number(existing.std_time) : null };
  const after: Record<string, unknown> = { ...updated, std_time: updated.std_time != null ? Number(updated.std_time) : null };
  logDataChanges('tb_process', processCd, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteProcess(processCd: string) {
  const existing = await prisma.tbProcess.findUnique({ where: { process_cd: processCd } });
  if (!existing) throw new AppError('존재하지 않는 공정입니다.', 404);

  try {
    await prisma.tbProcess.delete({ where: { process_cd: processCd } });
    return { message: '공정이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Bulk Import (Excel) ───

const IMPORT_COLUMN_MAP: ColumnMap = {
  '공정코드': { field: 'process_cd', required: true },
  '공정명':   { field: 'process_nm', required: true },
  '공정유형': { field: 'process_type' },
  '표준시간': { field: 'std_time', type: 'number' },
  '작업장코드': { field: 'workshop_cd' },
  '사용여부': { field: 'use_yn' },
};

interface ImportRow {
  process_cd: string;
  process_nm: string;
  process_type?: string | null;
  std_time?: number | null;
  workshop_cd?: string | null;
  use_yn?: string | null;
}

const VALID_PROCESS_TYPES = ['MACHINING', 'ASSY', 'INSP', 'PKG'];

export async function bulkImportProcesses(buffer: Buffer, userId?: string) {
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
      if (row.process_type && !VALID_PROCESS_TYPES.includes(row.process_type)) {
        rowErrors.push({ row: i + 2, column: 'process_type', message: '공정유형은 MACHINING, ASSY, INSP, PKG 중 하나여야 합니다.' });
        errorCount++;
        continue;
      }

      if (row.use_yn && !['Y', 'N'].includes(row.use_yn)) {
        rowErrors.push({ row: i + 2, column: 'use_yn', message: '사용여부는 Y 또는 N만 가능합니다.' });
        errorCount++;
        continue;
      }

      await prisma.tbProcess.upsert({
        where: { process_cd: row.process_cd },
        create: {
          process_cd: row.process_cd,
          process_nm: row.process_nm,
          process_type: row.process_type ?? null,
          std_time: row.std_time ?? null,
          workshop_cd: row.workshop_cd ?? null,
          use_yn: row.use_yn ?? 'Y',
          create_by: userId ?? null,
          update_by: userId ?? null,
        },
        update: {
          process_nm: row.process_nm,
          process_type: row.process_type ?? null,
          std_time: row.std_time ?? null,
          workshop_cd: row.workshop_cd ?? null,
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
  { header: '공정코드', key: 'process_cd', width: 15 },
  { header: '공정명',   key: 'process_nm', width: 25 },
  { header: '공정유형', key: 'process_type', width: 12 },
  { header: '표준시간', key: 'std_time', width: 10 },
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '사용여부', key: 'use_yn', width: 8 },
  { header: '등록자',   key: 'create_by', width: 12 },
  { header: '등록일시', key: 'create_dt', width: 18 },
  { header: '수정자',   key: 'update_by', width: 12 },
  { header: '수정일시', key: 'update_dt', width: 18 },
];

export async function exportProcesses(req: Request, res: Response) {
  const where = parseFilters(req, ALLOWED_FIELDS);

  const processes = await prisma.tbProcess.findMany({
    where: where as any,
    select: processSelect,
    orderBy: { process_cd: 'asc' },
  });

  await exportToExcel(res, EXPORT_COLUMNS, processes as any[], '공정목록');
}
