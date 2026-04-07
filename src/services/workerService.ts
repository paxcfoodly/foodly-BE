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
const ALLOWED_FIELDS = ['worker_id', 'worker_nm', 'dept_cd', 'workshop_cd', 'shift_cd', 'use_yn'];

const workerSelect = {
  worker_id: true,
  worker_nm: true,
  dept_cd: true,
  workshop_cd: true,
  shift_cd: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listWorkers(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, workers] = await Promise.all([
    prisma.tbWorker.count({ where: where as any }),
    prisma.tbWorker.findMany({
      where: where as any,
      select: workerSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ worker_id: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(workers, total, page, limit);
}

// ─── Get by ID ───

export async function getWorkerById(workerId: string) {
  const worker = await prisma.tbWorker.findUnique({
    where: { worker_id: workerId },
    select: workerSelect,
  });
  if (!worker) throw new AppError('존재하지 않는 작업자입니다.', 404);
  return worker;
}

// ─── Create ───

export interface WorkerCreateInput {
  worker_id: string;
  worker_nm: string;
  dept_cd?: string | null;
  workshop_cd?: string | null;
  shift_cd?: string | null;
  use_yn?: string;
}

export async function createWorker(input: WorkerCreateInput, userId?: string) {
  const existing = await prisma.tbWorker.findUnique({ where: { worker_id: input.worker_id } });
  if (existing) throw new AppError('이미 존재하는 작업자 사번입니다.', 409);

  const worker = await prisma.tbWorker.create({
    data: {
      worker_id: input.worker_id,
      worker_nm: input.worker_nm,
      dept_cd: input.dept_cd ?? null,
      workshop_cd: input.workshop_cd ?? null,
      shift_cd: input.shift_cd ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: workerSelect,
  });
  return worker;
}

// ─── Update (with data history) ───

export interface WorkerUpdateInput {
  worker_nm?: string;
  dept_cd?: string | null;
  workshop_cd?: string | null;
  shift_cd?: string | null;
  use_yn?: string;
}

export async function updateWorker(workerId: string, input: WorkerUpdateInput, userId?: string) {
  const existing = await prisma.tbWorker.findUnique({ where: { worker_id: workerId }, select: workerSelect });
  if (!existing) throw new AppError('존재하지 않는 작업자입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.worker_nm !== undefined) data.worker_nm = input.worker_nm;
  if (input.dept_cd !== undefined) data.dept_cd = input.dept_cd;
  if (input.workshop_cd !== undefined) data.workshop_cd = input.workshop_cd;
  if (input.shift_cd !== undefined) data.shift_cd = input.shift_cd;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbWorker.update({
    where: { worker_id: workerId },
    data: data as any,
    select: workerSelect,
  });

  const before: Record<string, unknown> = { ...existing };
  const after: Record<string, unknown> = { ...updated };
  logDataChanges('tb_worker', workerId, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteWorker(workerId: string) {
  const existing = await prisma.tbWorker.findUnique({ where: { worker_id: workerId } });
  if (!existing) throw new AppError('존재하지 않는 작업자입니다.', 404);

  try {
    await prisma.tbWorker.delete({ where: { worker_id: workerId } });
    return { message: '작업자가 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}
