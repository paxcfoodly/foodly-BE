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
const ALLOWED_FIELDS = ['wo_id', 'lot_no', 'equip_cd', 'worker_id'];

const prodResultSelect = {
  result_id: true,
  wo_id: true,
  lot_no: true,
  equip_cd: true,
  worker_id: true,
  good_qty: true,
  defect_qty: true,
  work_start_dt: true,
  work_end_dt: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  work_order: { select: { wo_no: true, item_cd: true, item: { select: { item_nm: true } } } },
  lot: { select: { lot_no: true, lot_qty: true } },
  equipment: { select: { equip_nm: true } },
  worker: { select: { worker_nm: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    good_qty: row.good_qty != null ? Number(row.good_qty) : 0,
    defect_qty: row.defect_qty != null ? Number(row.defect_qty) : 0,
    lot: row.lot
      ? { ...row.lot, lot_qty: row.lot.lot_qty != null ? Number(row.lot.lot_qty) : null }
      : null,
  };
}

/**
 * Re-calculate good_qty / defect_qty on the parent work order
 * by SUM-ing all related TbProdResult rows.
 * Must be called INSIDE a transaction (tx).
 */
async function syncWorkOrderQty(tx: any, woId: number) {
  const agg = await tx.tbProdResult.aggregate({
    where: { wo_id: woId },
    _sum: { good_qty: true, defect_qty: true },
  });
  await tx.tbWorkOrder.update({
    where: { wo_id: woId },
    data: {
      good_qty: agg._sum.good_qty ?? 0,
      defect_qty: agg._sum.defect_qty ?? 0,
    },
  });
}

// ─── List (paginated + filtered + sorted) ───

export async function listProdResults(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, results] = await Promise.all([
    prisma.tbProdResult.count({ where: where as any }),
    prisma.tbProdResult.findMany({
      where: where as any,
      select: prodResultSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ result_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(results.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getProdResultById(resultId: number) {
  const result = await prisma.tbProdResult.findUnique({
    where: { result_id: resultId },
    select: prodResultSelect,
  });
  if (!result) throw new AppError('존재하지 않는 생산실적입니다.', 404);
  return toPlain(result);
}

// ─── Create ───

export interface ProdResultCreateInput {
  wo_id: number;
  equip_cd?: string | null;
  worker_id?: string | null;
  good_qty: number;
  defect_qty: number;
  work_start_dt?: string | null;
  work_end_dt?: string | null;
  auto_lot?: boolean;
}

export async function createProdResult(input: ProdResultCreateInput, loginId?: string) {
  // Validate FK: work order exists
  const wo = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: input.wo_id },
    select: { wo_id: true, item_cd: true },
  });
  if (!wo) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // LOT auto-generation — MUST be called OUTSIDE the main $transaction
  // because generateNumberWithDateReset uses its own $transaction with FOR UPDATE lock.
  let lotNo: string | null = null;
  if (input.auto_lot) {
    lotNo = await generateNumberWithDateReset('LOT');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create LOT if auto_lot
    if (lotNo) {
      await tx.tbLot.create({
        data: {
          lot_no: lotNo,
          item_cd: wo.item_cd,
          lot_qty: input.good_qty,
          lot_status: 'ACTIVE',
          create_type: 'PRODUCTION',
          wo_id: wo.wo_id,
          create_by: loginId ?? null,
          update_by: loginId ?? null,
        },
      });
    }

    // Create production result
    const created = await tx.tbProdResult.create({
      data: {
        wo_id: input.wo_id,
        lot_no: lotNo,
        equip_cd: input.equip_cd ?? null,
        worker_id: input.worker_id ?? null,
        good_qty: input.good_qty,
        defect_qty: input.defect_qty,
        work_start_dt: input.work_start_dt ? new Date(input.work_start_dt) : null,
        work_end_dt: input.work_end_dt ? new Date(input.work_end_dt) : null,
        create_by: loginId ?? null,
        update_by: loginId ?? null,
      },
      select: prodResultSelect,
    });

    // Sync WO qty
    await syncWorkOrderQty(tx, input.wo_id);

    return created;
  });

  return toPlain(result);
}

// ─── Update ───

export interface ProdResultUpdateInput {
  equip_cd?: string | null;
  worker_id?: string | null;
  good_qty?: number;
  defect_qty?: number;
  work_start_dt?: string | null;
  work_end_dt?: string | null;
}

export async function updateProdResult(resultId: number, input: ProdResultUpdateInput, loginId?: string) {
  const existing = await prisma.tbProdResult.findUnique({
    where: { result_id: resultId },
    select: { result_id: true, wo_id: true },
  });
  if (!existing) throw new AppError('존재하지 않는 생산실적입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: loginId ?? null,
    update_dt: new Date(),
  };
  if (input.equip_cd !== undefined) data.equip_cd = input.equip_cd;
  if (input.worker_id !== undefined) data.worker_id = input.worker_id;
  if (input.good_qty !== undefined) data.good_qty = input.good_qty;
  if (input.defect_qty !== undefined) data.defect_qty = input.defect_qty;
  if (input.work_start_dt !== undefined) data.work_start_dt = input.work_start_dt ? new Date(input.work_start_dt) : null;
  if (input.work_end_dt !== undefined) data.work_end_dt = input.work_end_dt ? new Date(input.work_end_dt) : null;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.tbProdResult.update({
      where: { result_id: resultId },
      data: data as any,
      select: prodResultSelect,
    });

    // Sync WO qty
    await syncWorkOrderQty(tx, existing.wo_id);

    return updated;
  });

  return toPlain(result);
}

// ─── Delete ───

export async function deleteProdResult(resultId: number) {
  const existing = await prisma.tbProdResult.findUnique({
    where: { result_id: resultId },
    select: { result_id: true, wo_id: true },
  });
  if (!existing) throw new AppError('존재하지 않는 생산실적입니다.', 404);

  await prisma.$transaction(async (tx) => {
    await tx.tbProdResult.delete({ where: { result_id: resultId } });
    await syncWorkOrderQty(tx, existing.wo_id);
  });

  return { message: '생산실적이 삭제되었습니다.' };
}
