import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logDataChanges } from './dataHistoryService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
} from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['inspect_std_id', 'item_cd', 'process_cd', 'inspect_type', 'inspect_item_nm', 'use_yn'];

const inspectStdSelect = {
  inspect_std_id: true,
  item_cd: true,
  process_cd: true,
  inspect_type: true,
  inspect_item_nm: true,
  measure_type: true,
  lsl: true,
  target_val: true,
  usl: true,
  unit: true,
  sampling_std: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listInspectStds(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, inspectStds] = await Promise.all([
    prisma.tbInspectStd.count({ where: where as any }),
    prisma.tbInspectStd.findMany({
      where: where as any,
      select: inspectStdSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ inspect_std_id: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(inspectStds, total, page, limit);
}

// ─── Get by ID ───

export async function getInspectStdById(inspectStdId: number) {
  const inspectStd = await prisma.tbInspectStd.findUnique({
    where: { inspect_std_id: inspectStdId },
    select: inspectStdSelect,
  });
  if (!inspectStd) throw new AppError('존재하지 않는 검사기준입니다.', 404);
  return inspectStd;
}

// ─── Create ───

export interface InspectStdCreateInput {
  item_cd?: string | null;
  process_cd?: string | null;
  inspect_type?: string | null;
  inspect_item_nm: string;
  measure_type?: string | null;
  lsl?: number | null;
  target_val?: number | null;
  usl?: number | null;
  unit?: string | null;
  sampling_std?: string | null;
  use_yn?: string;
}

export async function createInspectStd(input: InspectStdCreateInput, userId?: string) {
  const inspectStd = await prisma.tbInspectStd.create({
    data: {
      item_cd: input.item_cd ?? null,
      process_cd: input.process_cd ?? null,
      inspect_type: input.inspect_type ?? null,
      inspect_item_nm: input.inspect_item_nm,
      measure_type: input.measure_type ?? null,
      lsl: input.lsl ?? null,
      target_val: input.target_val ?? null,
      usl: input.usl ?? null,
      unit: input.unit ?? null,
      sampling_std: input.sampling_std ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: inspectStdSelect,
  });
  return inspectStd;
}

// ─── Update (with data history) ───

export interface InspectStdUpdateInput {
  item_cd?: string | null;
  process_cd?: string | null;
  inspect_type?: string | null;
  inspect_item_nm?: string;
  measure_type?: string | null;
  lsl?: number | null;
  target_val?: number | null;
  usl?: number | null;
  unit?: string | null;
  sampling_std?: string | null;
  use_yn?: string;
}

export async function updateInspectStd(inspectStdId: number, input: InspectStdUpdateInput, userId?: string) {
  const existing = await prisma.tbInspectStd.findUnique({ where: { inspect_std_id: inspectStdId }, select: inspectStdSelect });
  if (!existing) throw new AppError('존재하지 않는 검사기준입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.item_cd !== undefined) data.item_cd = input.item_cd;
  if (input.process_cd !== undefined) data.process_cd = input.process_cd;
  if (input.inspect_type !== undefined) data.inspect_type = input.inspect_type;
  if (input.inspect_item_nm !== undefined) data.inspect_item_nm = input.inspect_item_nm;
  if (input.measure_type !== undefined) data.measure_type = input.measure_type;
  if (input.lsl !== undefined) data.lsl = input.lsl;
  if (input.target_val !== undefined) data.target_val = input.target_val;
  if (input.usl !== undefined) data.usl = input.usl;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.sampling_std !== undefined) data.sampling_std = input.sampling_std;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbInspectStd.update({
    where: { inspect_std_id: inspectStdId },
    data: data as any,
    select: inspectStdSelect,
  });

  const before: Record<string, unknown> = { ...existing, lsl: existing.lsl != null ? Number(existing.lsl) : null, target_val: existing.target_val != null ? Number(existing.target_val) : null, usl: existing.usl != null ? Number(existing.usl) : null };
  const after: Record<string, unknown> = { ...updated, lsl: updated.lsl != null ? Number(updated.lsl) : null, target_val: updated.target_val != null ? Number(updated.target_val) : null, usl: updated.usl != null ? Number(updated.usl) : null };
  logDataChanges('tb_inspect_std', String(inspectStdId), before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteInspectStd(inspectStdId: number) {
  const existing = await prisma.tbInspectStd.findUnique({ where: { inspect_std_id: inspectStdId } });
  if (!existing) throw new AppError('존재하지 않는 검사기준입니다.', 404);

  try {
    await prisma.tbInspectStd.delete({ where: { inspect_std_id: inspectStdId } });
    return { message: '검사기준이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}
