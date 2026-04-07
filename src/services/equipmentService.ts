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
const ALLOWED_FIELDS = ['equip_cd', 'equip_nm', 'equip_type', 'workshop_cd', 'use_yn'];

const equipmentSelect = {
  equip_cd: true,
  equip_nm: true,
  equip_type: true,
  maker: true,
  model_nm: true,
  install_date: true,
  workshop_cd: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listEquipments(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, equipments] = await Promise.all([
    prisma.tbEquipment.count({ where: where as any }),
    prisma.tbEquipment.findMany({
      where: where as any,
      select: equipmentSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ equip_cd: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(equipments, total, page, limit);
}

// ─── Get by ID ───

export async function getEquipmentById(equipCd: string) {
  const equipment = await prisma.tbEquipment.findUnique({
    where: { equip_cd: equipCd },
    select: equipmentSelect,
  });
  if (!equipment) throw new AppError('존재하지 않는 설비입니다.', 404);
  return equipment;
}

// ─── Create ───

export interface EquipmentCreateInput {
  equip_cd: string;
  equip_nm: string;
  equip_type?: string | null;
  maker?: string | null;
  model_nm?: string | null;
  install_date?: string | null;
  workshop_cd?: string | null;
  use_yn?: string;
}

export async function createEquipment(input: EquipmentCreateInput, userId?: string) {
  const existing = await prisma.tbEquipment.findUnique({ where: { equip_cd: input.equip_cd } });
  if (existing) throw new AppError('이미 존재하는 설비코드입니다.', 409);

  const equipment = await prisma.tbEquipment.create({
    data: {
      equip_cd: input.equip_cd,
      equip_nm: input.equip_nm,
      equip_type: input.equip_type ?? null,
      maker: input.maker ?? null,
      model_nm: input.model_nm ?? null,
      install_date: input.install_date ? new Date(input.install_date) : null,
      workshop_cd: input.workshop_cd ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: equipmentSelect,
  });
  return equipment;
}

// ─── Update (with data history) ───

export interface EquipmentUpdateInput {
  equip_nm?: string;
  equip_type?: string | null;
  maker?: string | null;
  model_nm?: string | null;
  install_date?: string | null;
  workshop_cd?: string | null;
  use_yn?: string;
}

export async function updateEquipment(equipCd: string, input: EquipmentUpdateInput, userId?: string) {
  const existing = await prisma.tbEquipment.findUnique({ where: { equip_cd: equipCd }, select: equipmentSelect });
  if (!existing) throw new AppError('존재하지 않는 설비입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.equip_nm !== undefined) data.equip_nm = input.equip_nm;
  if (input.equip_type !== undefined) data.equip_type = input.equip_type;
  if (input.maker !== undefined) data.maker = input.maker;
  if (input.model_nm !== undefined) data.model_nm = input.model_nm;
  if (input.install_date !== undefined) data.install_date = input.install_date ? new Date(input.install_date) : null;
  if (input.workshop_cd !== undefined) data.workshop_cd = input.workshop_cd;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbEquipment.update({
    where: { equip_cd: equipCd },
    data: data as any,
    select: equipmentSelect,
  });

  const before: Record<string, unknown> = { ...existing };
  const after: Record<string, unknown> = { ...updated };
  logDataChanges('tb_equipment', equipCd, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteEquipment(equipCd: string) {
  const existing = await prisma.tbEquipment.findUnique({ where: { equip_cd: equipCd } });
  if (!existing) throw new AppError('존재하지 않는 설비입니다.', 404);

  try {
    await prisma.tbEquipment.delete({ where: { equip_cd: equipCd } });
    return { message: '설비가 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Bulk Import (Excel) ───

const IMPORT_COLUMN_MAP: ColumnMap = {
  '설비코드': { field: 'equip_cd', required: true },
  '설비명':   { field: 'equip_nm', required: true },
  '설비유형': { field: 'equip_type' },
  '제조사':   { field: 'maker' },
  '모델명':   { field: 'model_nm' },
  '설치일':   { field: 'install_date' },
  '작업장코드': { field: 'workshop_cd' },
  '사용여부': { field: 'use_yn' },
};

interface ImportRow {
  equip_cd: string;
  equip_nm: string;
  equip_type?: string | null;
  maker?: string | null;
  model_nm?: string | null;
  install_date?: string | null;
  workshop_cd?: string | null;
  use_yn?: string | null;
}

const VALID_EQUIP_TYPES = ['CNC', 'PRESS', 'INJECTION', 'PACKAGING'];

export async function bulkImportEquipments(buffer: Buffer, userId?: string) {
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
      if (row.equip_type && !VALID_EQUIP_TYPES.includes(row.equip_type)) {
        rowErrors.push({ row: i + 2, column: 'equip_type', message: '설비유형은 CNC, PRESS, INJECTION, PACKAGING 중 하나여야 합니다.' });
        errorCount++;
        continue;
      }

      if (row.use_yn && !['Y', 'N'].includes(row.use_yn)) {
        rowErrors.push({ row: i + 2, column: 'use_yn', message: '사용여부는 Y 또는 N만 가능합니다.' });
        errorCount++;
        continue;
      }

      await prisma.tbEquipment.upsert({
        where: { equip_cd: row.equip_cd },
        create: {
          equip_cd: row.equip_cd,
          equip_nm: row.equip_nm,
          equip_type: row.equip_type ?? null,
          maker: row.maker ?? null,
          model_nm: row.model_nm ?? null,
          install_date: row.install_date ? new Date(row.install_date) : null,
          workshop_cd: row.workshop_cd ?? null,
          use_yn: row.use_yn ?? 'Y',
          create_by: userId ?? null,
          update_by: userId ?? null,
        },
        update: {
          equip_nm: row.equip_nm,
          equip_type: row.equip_type ?? null,
          maker: row.maker ?? null,
          model_nm: row.model_nm ?? null,
          install_date: row.install_date ? new Date(row.install_date) : null,
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
  { header: '설비코드', key: 'equip_cd', width: 15 },
  { header: '설비명',   key: 'equip_nm', width: 25 },
  { header: '설비유형', key: 'equip_type', width: 12 },
  { header: '제조사',   key: 'maker', width: 15 },
  { header: '모델명',   key: 'model_nm', width: 15 },
  { header: '설치일',   key: 'install_date', width: 12 },
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '사용여부', key: 'use_yn', width: 8 },
  { header: '등록자',   key: 'create_by', width: 12 },
  { header: '등록일시', key: 'create_dt', width: 18 },
  { header: '수정자',   key: 'update_by', width: 12 },
  { header: '수정일시', key: 'update_dt', width: 18 },
];

export async function exportEquipments(req: Request, res: Response) {
  const where = parseFilters(req, ALLOWED_FIELDS);

  const equipments = await prisma.tbEquipment.findMany({
    where: where as any,
    select: equipmentSelect,
    orderBy: { equip_cd: 'asc' },
  });

  await exportToExcel(res, EXPORT_COLUMNS, equipments as any[], '설비목록');
}
