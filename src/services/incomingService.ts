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
const ALLOWED_FIELDS = ['incoming_no', 'status', 'cust_cd'];

const incomingSelect = {
  incoming_id: true,
  incoming_no: true,
  cust_cd: true,
  status: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  customer: { select: { cust_nm: true } },
  details: {
    select: {
      incoming_dtl_id: true,
      item_cd: true,
      lot_no: true,
      incoming_qty: true,
      inspect_status: true,
      item: { select: { item_nm: true } },
    },
  },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    details: row.details?.map((d: any) => ({
      ...d,
      incoming_qty: d.incoming_qty != null ? Number(d.incoming_qty) : 0,
    })),
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listIncomings(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, incomings] = await Promise.all([
    prisma.tbIncoming.count({ where: where as any }),
    prisma.tbIncoming.findMany({
      where: where as any,
      select: incomingSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ incoming_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(incomings.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getIncomingById(incomingId: number) {
  const incoming = await prisma.tbIncoming.findUnique({
    where: { incoming_id: incomingId },
    select: incomingSelect,
  });
  if (!incoming) throw new AppError('존재하지 않는 입고입니다.', 404);
  return toPlain(incoming);
}

// ─── Create ───

export interface IncomingCreateInput {
  cust_cd: string;
  details: Array<{
    item_cd: string;
    lot_no?: string | null;
    incoming_qty: number;
  }>;
}

export async function createIncoming(input: IncomingCreateInput, userId?: string) {
  if (!input.cust_cd) {
    throw new AppError('거래처코드는 필수 항목입니다.', 400);
  }
  if (!input.details || input.details.length === 0) {
    throw new AppError('상세 항목은 1건 이상이어야 합니다.', 400);
  }

  // Generate number OUTSIDE transaction (deadlock prevention)
  const incoming_no = await generateNumberWithDateReset('INCOMING');

  const incoming = await prisma.$transaction(async (tx) => {
    const header = await tx.tbIncoming.create({
      data: {
        incoming_no,
        cust_cd: input.cust_cd,
        status: 'PLAN',
        create_by: userId,
        update_by: userId,
      },
    });

    await tx.tbIncomingDtl.createMany({
      data: input.details.map((d) => ({
        incoming_id: header.incoming_id,
        item_cd: d.item_cd,
        lot_no: d.lot_no ?? null,
        incoming_qty: d.incoming_qty,
        inspect_status: 'PENDING',
        create_by: userId,
        update_by: userId,
      })),
    });

    return tx.tbIncoming.findUnique({
      where: { incoming_id: header.incoming_id },
      select: incomingSelect,
    });
  });

  return toPlain(incoming);
}

// ─── Update (only PLAN status) ───

export interface IncomingUpdateInput {
  cust_cd?: string;
  details?: Array<{
    item_cd: string;
    lot_no?: string | null;
    incoming_qty: number;
  }>;
}

export async function updateIncoming(incomingId: number, input: IncomingUpdateInput, userId?: string) {
  const existing = await prisma.tbIncoming.findUnique({ where: { incoming_id: incomingId } });
  if (!existing) throw new AppError('존재하지 않는 입고입니다.', 404);
  if (existing.status !== 'PLAN') throw new AppError('계획 상태에서만 수정할 수 있습니다.', 400);

  const incoming = await prisma.$transaction(async (tx) => {
    await tx.tbIncoming.update({
      where: { incoming_id: incomingId },
      data: {
        cust_cd: input.cust_cd,
        update_by: userId,
      },
    });

    if (input.details) {
      await tx.tbIncomingDtl.deleteMany({ where: { incoming_id: incomingId } });
      await tx.tbIncomingDtl.createMany({
        data: input.details.map((d) => ({
          incoming_id: incomingId,
          item_cd: d.item_cd,
          lot_no: d.lot_no ?? null,
          incoming_qty: d.incoming_qty,
          inspect_status: 'PENDING',
          create_by: userId,
          update_by: userId,
        })),
      });
    }

    return tx.tbIncoming.findUnique({
      where: { incoming_id: incomingId },
      select: incomingSelect,
    });
  });

  return toPlain(incoming);
}

// ─── Delete (only PLAN status) ───

export async function deleteIncoming(incomingId: number) {
  const existing = await prisma.tbIncoming.findUnique({ where: { incoming_id: incomingId } });
  if (!existing) throw new AppError('존재하지 않는 입고입니다.', 404);
  if (existing.status !== 'PLAN') throw new AppError('계획 상태에서만 삭제할 수 있습니다.', 400);

  await prisma.$transaction(async (tx) => {
    await tx.tbIncomingDtl.deleteMany({ where: { incoming_id: incomingId } });
    await tx.tbIncoming.delete({ where: { incoming_id: incomingId } });
  });

  return { deleted: true };
}

// ─── Confirm: PLAN → CONFIRMED ───

export interface ConfirmIncomingInput {
  wh_cd: string; // destination warehouse
}

export async function confirmIncoming(incomingId: number, input: ConfirmIncomingInput, userId?: string) {
  const whCd = input.wh_cd || 'WH-MAIN';

  const existing = await prisma.tbIncoming.findUnique({
    where: { incoming_id: incomingId },
    select: incomingSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 입고입니다.', 404);
  if (existing.status !== 'PLAN') throw new AppError('계획 상태에서만 확인처리할 수 있습니다.', 400);

  const incoming = await prisma.$transaction(async (tx) => {
    // For each detail, add to inventory
    for (const dtl of existing.details) {
      const incomingQty = Number(dtl.incoming_qty);

      // Use findFirst instead of upsert (nullable lot_no compound unique issue)
      const inv = await tx.tbInventory.findFirst({
        where: {
          item_cd: dtl.item_cd,
          lot_no: dtl.lot_no ?? null,
          wh_cd: whCd,
        },
      });

      if (inv) {
        const beforeQty = Number(inv.qty);
        const afterQty = beforeQty + incomingQty;

        await tx.tbInventory.update({
          where: { inventory_id: inv.inventory_id },
          data: {
            qty: afterQty,
            available_qty: Number(inv.available_qty) + incomingQty,
            update_by: userId,
          },
        });

        // Log inventory transaction
        await tx.tbInventoryTx.create({
          data: {
            item_cd: dtl.item_cd,
            lot_no: dtl.lot_no ?? null,
            tx_type: 'IN',
            tx_qty: incomingQty,
            before_qty: beforeQty,
            after_qty: afterQty,
            create_by: userId,
          },
        });
      } else {
        // Create new inventory record
        await tx.tbInventory.create({
          data: {
            item_cd: dtl.item_cd,
            lot_no: dtl.lot_no ?? null,
            wh_cd: whCd,
            qty: incomingQty,
            allocated_qty: 0,
            available_qty: incomingQty,
            create_by: userId,
            update_by: userId,
          },
        });

        // Log inventory transaction
        await tx.tbInventoryTx.create({
          data: {
            item_cd: dtl.item_cd,
            lot_no: dtl.lot_no ?? null,
            tx_type: 'IN',
            tx_qty: incomingQty,
            before_qty: 0,
            after_qty: incomingQty,
            create_by: userId,
          },
        });
      }
    }

    // Update header status
    await tx.tbIncoming.update({
      where: { incoming_id: incomingId },
      data: { status: 'CONFIRMED', update_by: userId },
    });

    return tx.tbIncoming.findUnique({
      where: { incoming_id: incomingId },
      select: incomingSelect,
    });
  });

  return toPlain(incoming);
}
