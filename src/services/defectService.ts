import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { generateNumberWithDateReset } from './numberingService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
} from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['defect_no', 'item_cd', 'lot_no', 'defect_type_cd', 'status'];

const defectSelect = {
  defect_id: true,
  defect_no: true,
  wo_id: true,
  item_cd: true,
  lot_no: true,
  defect_type_cd: true,
  defect_cause_cd: true,
  defect_qty: true,
  status: true,
  process_cd: true,
  remark: true,
  file_id: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true } },
  lot: { select: { lot_status: true } },
  work_order: { select: { wo_no: true } },
  disposals: {
    select: {
      dispose_id: true,
      dispose_type: true,
      dispose_qty: true,
      approve_by: true,
      approve_dt: true,
      remark: true,
      create_by: true,
      create_dt: true,
    },
    orderBy: { dispose_id: 'asc' as const },
  },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    defect_qty: row.defect_qty != null ? Number(row.defect_qty) : 0,
    disposals: row.disposals?.map((d: any) => ({
      ...d,
      dispose_qty: d.dispose_qty != null ? Number(d.dispose_qty) : 0,
    })),
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listDefects(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS) as any;
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  // Additional filter for status from query param
  if (req.query.status) {
    where.status = req.query.status as string;
  }

  const [total, defects] = await Promise.all([
    prisma.tbDefect.count({ where }),
    prisma.tbDefect.findMany({
      where,
      select: defectSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ defect_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(defects.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getDefectById(defectId: number) {
  const defect = await prisma.tbDefect.findUnique({
    where: { defect_id: defectId },
    select: defectSelect,
  });
  if (!defect) throw new AppError('존재하지 않는 불량입니다.', 404);
  return toPlain(defect);
}

// ─── Create ───

export interface DefectCreateInput {
  wo_id?: number | null;
  item_cd: string;
  lot_no?: string | null;
  defect_type_cd: string;
  defect_cause_cd?: string | null;
  defect_qty: number;
  process_cd?: string | null;
  remark?: string | null;
  file_id?: number | null;
}

export async function createDefect(input: DefectCreateInput, userId?: string) {
  if (!input.item_cd) {
    throw new AppError('품목코드는 필수 항목입니다.', 400);
  }
  if (!input.defect_type_cd) {
    throw new AppError('불량유형코드는 필수 항목입니다.', 400);
  }
  if (input.defect_qty == null || input.defect_qty <= 0) {
    throw new AppError('불량수량은 0보다 커야 합니다.', 400);
  }

  // Generate defect number OUTSIDE transaction (deadlock prevention)
  const defect_no = await generateNumberWithDateReset('DEFECT');

  const defect = await prisma.tbDefect.create({
    data: {
      defect_no,
      wo_id: input.wo_id ?? null,
      item_cd: input.item_cd,
      lot_no: input.lot_no ?? null,
      defect_type_cd: input.defect_type_cd,
      defect_cause_cd: input.defect_cause_cd ?? null,
      defect_qty: input.defect_qty,
      status: 'REGISTERED',
      process_cd: input.process_cd ?? null,
      remark: input.remark ?? null,
      file_id: input.file_id ?? null,
      create_by: userId,
      update_by: userId,
    },
    select: defectSelect,
  });

  return toPlain(defect);
}

// ─── Update (only when status is REGISTERED) ───

export interface DefectUpdateInput {
  wo_id?: number | null;
  item_cd?: string;
  lot_no?: string | null;
  defect_type_cd?: string;
  defect_cause_cd?: string | null;
  defect_qty?: number;
  process_cd?: string | null;
  remark?: string | null;
  file_id?: number | null;
}

export async function updateDefect(defectId: number, input: DefectUpdateInput, userId?: string) {
  const existing = await prisma.tbDefect.findUnique({ where: { defect_id: defectId } });
  if (!existing) throw new AppError('존재하지 않는 불량입니다.', 404);
  if (existing.status !== 'REGISTERED') {
    throw new AppError('등록 상태에서만 수정할 수 있습니다.', 400);
  }

  const defect = await prisma.tbDefect.update({
    where: { defect_id: defectId },
    data: {
      wo_id: input.wo_id ?? undefined,
      item_cd: input.item_cd,
      lot_no: input.lot_no ?? undefined,
      defect_type_cd: input.defect_type_cd,
      defect_cause_cd: input.defect_cause_cd ?? undefined,
      defect_qty: input.defect_qty,
      process_cd: input.process_cd ?? undefined,
      remark: input.remark ?? undefined,
      file_id: input.file_id ?? undefined,
      update_by: userId,
    },
    select: defectSelect,
  });

  return toPlain(defect);
}

// ─── Delete (only when status is REGISTERED) ───

export async function deleteDefect(defectId: number) {
  const existing = await prisma.tbDefect.findUnique({ where: { defect_id: defectId } });
  if (!existing) throw new AppError('존재하지 않는 불량입니다.', 404);
  if (existing.status !== 'REGISTERED') {
    throw new AppError('등록 상태에서만 삭제할 수 있습니다.', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tbDefectDispose.deleteMany({ where: { defect_id: defectId } });
    await tx.tbDefect.delete({ where: { defect_id: defectId } });
  });

  return { deleted: true };
}
