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
const ALLOWED_FIELDS = ['ship_no', 'status', 'cust_cd', 'plan_dt'];

const shipmentSelect = {
  ship_id: true,
  ship_no: true,
  cust_cd: true,
  status: true,
  plan_dt: true,
  actual_ship_dt: true,
  cancel_reason: true,
  cancel_by: true,
  cancel_dt: true,
  remark: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  customer: { select: { cust_nm: true } },
  details: {
    select: {
      ship_dtl_id: true,
      item_cd: true,
      lot_no: true,
      order_qty: true,
      actual_qty: true,
      create_by: true,
      create_dt: true,
      update_by: true,
      update_dt: true,
      item: { select: { item_nm: true } },
      lot: { select: { lot_qty: true, lot_status: true, wh_cd: true } },
    },
  },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  if (!row) return row;
  return {
    ...row,
    details: row.details?.map((d: any) => ({
      ...d,
      order_qty: d.order_qty != null ? Number(d.order_qty) : 0,
      actual_qty: d.actual_qty != null ? Number(d.actual_qty) : null,
      lot: d.lot
        ? {
            ...d.lot,
            lot_qty: d.lot.lot_qty != null ? Number(d.lot.lot_qty) : 0,
          }
        : null,
    })),
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listShipments(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where: any = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  // Date range filter
  const startDt = req.query.start_dt as string | undefined;
  const endDt = req.query.end_dt as string | undefined;
  if (startDt && endDt) {
    where.plan_dt = { gte: new Date(startDt), lte: new Date(endDt) };
  }

  const [total, shipments] = await Promise.all([
    prisma.tbShipment.count({ where }),
    prisma.tbShipment.findMany({
      where,
      select: shipmentSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ ship_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(shipments.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getShipmentById(shipId: number) {
  const shipment = await prisma.tbShipment.findUnique({
    where: { ship_id: shipId },
    select: shipmentSelect,
  });
  if (!shipment) throw new AppError('존재하지 않는 출하입니다.', 404);
  return toPlain(shipment);
}

// ─── Create ───

export interface ShipmentCreateInput {
  cust_cd: string;
  plan_dt: string;
  remark?: string;
  details: Array<{ item_cd: string; lot_no?: string | null; order_qty: number }>;
}

export async function createShipment(input: ShipmentCreateInput, userId?: string) {
  if (!input.cust_cd) {
    throw new AppError('거래처코드는 필수 항목입니다.', 400);
  }
  if (!input.details || input.details.length === 0) {
    throw new AppError('상세 항목은 1건 이상이어야 합니다.', 400);
  }
  for (const d of input.details) {
    if (d.order_qty <= 0) {
      throw new AppError('주문수량은 0보다 커야 합니다.', 400);
    }
  }

  // Generate number OUTSIDE transaction (deadlock prevention)
  const ship_no = await generateNumberWithDateReset('SHIPPING');

  const shipment = await prisma.$transaction(async (tx) => {
    const header = await tx.tbShipment.create({
      data: {
        ship_no,
        cust_cd: input.cust_cd,
        plan_dt: input.plan_dt ? new Date(input.plan_dt) : undefined,
        remark: input.remark ?? null,
        status: 'PLAN',
        create_by: userId,
        update_by: userId,
      },
    });

    await tx.tbShipmentDtl.createMany({
      data: input.details.map((d) => ({
        ship_id: header.ship_id,
        item_cd: d.item_cd,
        lot_no: d.lot_no ?? null,
        order_qty: d.order_qty,
        create_by: userId,
        update_by: userId,
      })),
    });

    return tx.tbShipment.findUnique({
      where: { ship_id: header.ship_id },
      select: shipmentSelect,
    });
  });

  return toPlain(shipment);
}

// ─── Update (only PLAN status) ───

export interface ShipmentUpdateInput {
  cust_cd?: string;
  plan_dt?: string;
  remark?: string;
  details?: Array<{ item_cd: string; lot_no?: string | null; order_qty: number }>;
}

export async function updateShipment(shipId: number, input: ShipmentUpdateInput, userId?: string) {
  const existing = await prisma.tbShipment.findUnique({ where: { ship_id: shipId } });
  if (!existing) throw new AppError('존재하지 않는 출하입니다.', 404);
  if (existing.status !== 'PLAN') throw new AppError('계획 상태에서만 수정할 수 있습니다.', 400);

  const shipment = await prisma.$transaction(async (tx) => {
    await tx.tbShipment.update({
      where: { ship_id: shipId },
      data: {
        cust_cd: input.cust_cd,
        plan_dt: input.plan_dt ? new Date(input.plan_dt) : undefined,
        remark: input.remark,
        update_by: userId,
      },
    });

    if (input.details) {
      await tx.tbShipmentDtl.deleteMany({ where: { ship_id: shipId } });
      await tx.tbShipmentDtl.createMany({
        data: input.details.map((d) => ({
          ship_id: shipId,
          item_cd: d.item_cd,
          lot_no: d.lot_no ?? null,
          order_qty: d.order_qty,
          create_by: userId,
          update_by: userId,
        })),
      });
    }

    return tx.tbShipment.findUnique({
      where: { ship_id: shipId },
      select: shipmentSelect,
    });
  });

  return toPlain(shipment);
}

// ─── Delete (only PLAN status) ───

export async function deleteShipment(shipId: number) {
  const existing = await prisma.tbShipment.findUnique({ where: { ship_id: shipId } });
  if (!existing) throw new AppError('존재하지 않는 출하입니다.', 404);
  if (existing.status !== 'PLAN') throw new AppError('계획 상태에서만 삭제할 수 있습니다.', 400);

  await prisma.$transaction(async (tx) => {
    await tx.tbShipmentDtl.deleteMany({ where: { ship_id: shipId } });
    await tx.tbShipment.delete({ where: { ship_id: shipId } });
  });

  return { deleted: true };
}

// ─── Confirm: PLAN → SHIPPED ───

export interface ConfirmShipmentInput {
  details: Array<{ ship_dtl_id: number; actual_qty: number }>;
}

export async function confirmShipment(shipId: number, input: ConfirmShipmentInput, userId?: string) {
  const existing = await prisma.tbShipment.findUnique({
    where: { ship_id: shipId },
    select: shipmentSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 출하입니다.', 404);
  if (existing.status !== 'PLAN') throw new AppError('계획 상태에서만 확정할 수 있습니다.', 400);

  // Validate actual_qty against order_qty for each detail
  for (const inputDtl of input.details) {
    if (inputDtl.actual_qty < 1) {
      throw new AppError('실제출하수량은 1 이상이어야 합니다.', 400);
    }
    const dtl = existing.details.find((d) => d.ship_dtl_id === inputDtl.ship_dtl_id);
    if (!dtl) throw new AppError(`출하상세 ID ${inputDtl.ship_dtl_id}를 찾을 수 없습니다.`, 404);
    if (inputDtl.actual_qty > Number(dtl.order_qty)) {
      throw new AppError('실제출하수량은 주문수량을 초과할 수 없습니다.', 400);
    }
  }

  const shipment = await prisma.$transaction(async (tx) => {
    for (const inputDtl of input.details) {
      const dtl = existing.details.find((d) => d.ship_dtl_id === inputDtl.ship_dtl_id)!;
      const actualQty = inputDtl.actual_qty;

      // Find inventory by item_cd + lot_no + wh_cd
      const whCd = dtl.lot?.wh_cd ?? null;
      if (!whCd) throw new AppError(`LOT ${dtl.lot_no}의 창고 정보가 없습니다.`, 400);

      const inv = await tx.tbInventory.findFirst({
        where: {
          item_cd: dtl.item_cd,
          lot_no: dtl.lot_no ?? null,
          wh_cd: whCd,
        },
      });

      if (!inv) throw new AppError(`재고 정보를 찾을 수 없습니다. (item: ${dtl.item_cd})`, 404);

      const beforeQty = Number(inv.qty);
      const afterQty = beforeQty - actualQty;

      if (afterQty < 0) {
        throw new AppError(`재고가 부족합니다. (item: ${dtl.item_cd}, available: ${beforeQty})`, 400);
      }

      // Deduct inventory
      await tx.tbInventory.update({
        where: { inventory_id: inv.inventory_id },
        data: {
          qty: afterQty,
          available_qty: Number(inv.available_qty) - actualQty,
          update_by: userId,
        },
      });

      // Log inventory transaction (OUT)
      await tx.tbInventoryTx.create({
        data: {
          item_cd: dtl.item_cd,
          lot_no: dtl.lot_no ?? null,
          tx_type: 'OUT',
          tx_qty: actualQty,
          before_qty: beforeQty,
          after_qty: afterQty,
          create_by: userId,
        },
      });

      // Update lot_status to SHIPPED
      if (dtl.lot_no) {
        await tx.tbLot.update({
          where: { lot_no: dtl.lot_no },
          data: { lot_status: 'SHIPPED' },
        });
      }

      // Update detail actual_qty
      await tx.tbShipmentDtl.update({
        where: { ship_dtl_id: inputDtl.ship_dtl_id },
        data: { actual_qty: actualQty, update_by: userId },
      });
    }

    // Update shipment header
    await tx.tbShipment.update({
      where: { ship_id: shipId },
      data: { status: 'SHIPPED', actual_ship_dt: new Date(), update_by: userId },
    });

    return tx.tbShipment.findUnique({
      where: { ship_id: shipId },
      select: shipmentSelect,
    });
  });

  return toPlain(shipment);
}

// ─── Cancel Request: SHIPPED → CANCEL_REQ ───

export async function cancelRequest(shipId: number, cancelReason: string, userId?: string) {
  const existing = await prisma.tbShipment.findUnique({ where: { ship_id: shipId } });
  if (!existing) throw new AppError('존재하지 않는 출하입니다.', 404);
  if (existing.status !== 'SHIPPED') throw new AppError('출하 상태에서만 취소요청할 수 있습니다.', 400);

  const shipment = await prisma.tbShipment.update({
    where: { ship_id: shipId },
    data: {
      status: 'CANCEL_REQ',
      cancel_reason: cancelReason,
      update_by: userId,
    },
    select: shipmentSelect,
  });

  return toPlain(shipment);
}

// ─── Approve Cancel: CANCEL_REQ → CANCELLED ───

export async function approveCancelShipment(shipId: number, userId?: string) {
  const existing = await prisma.tbShipment.findUnique({
    where: { ship_id: shipId },
    select: shipmentSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 출하입니다.', 404);
  if (existing.status !== 'CANCEL_REQ') throw new AppError('취소요청 상태에서만 취소승인할 수 있습니다.', 400);

  const shipment = await prisma.$transaction(async (tx) => {
    // Restore inventory for each detail that has actual_qty
    for (const dtl of existing.details) {
      if (dtl.actual_qty == null) continue;
      const actualQty = Number(dtl.actual_qty);
      if (actualQty <= 0) continue;

      const whCd = dtl.lot?.wh_cd ?? null;
      if (!whCd) continue;

      const inv = await tx.tbInventory.findFirst({
        where: {
          item_cd: dtl.item_cd,
          lot_no: dtl.lot_no ?? null,
          wh_cd: whCd,
        },
      });

      if (inv) {
        const beforeQty = Number(inv.qty);
        const afterQty = beforeQty + actualQty;

        await tx.tbInventory.update({
          where: { inventory_id: inv.inventory_id },
          data: {
            qty: afterQty,
            available_qty: Number(inv.available_qty) + actualQty,
            update_by: userId,
          },
        });

        await tx.tbInventoryTx.create({
          data: {
            item_cd: dtl.item_cd,
            lot_no: dtl.lot_no ?? null,
            tx_type: 'IN',
            tx_qty: actualQty,
            before_qty: beforeQty,
            after_qty: afterQty,
            create_by: userId,
          },
        });
      }

      // Restore lot_status to ACTIVE
      if (dtl.lot_no) {
        await tx.tbLot.update({
          where: { lot_no: dtl.lot_no },
          data: { lot_status: 'ACTIVE' },
        });
      }
    }

    // Update shipment header
    await tx.tbShipment.update({
      where: { ship_id: shipId },
      data: {
        status: 'CANCELLED',
        cancel_by: userId,
        cancel_dt: new Date(),
        update_by: userId,
      },
    });

    return tx.tbShipment.findUnique({
      where: { ship_id: shipId },
      select: shipmentSelect,
    });
  });

  return toPlain(shipment);
}

// ─── Reject Cancel: CANCEL_REQ → SHIPPED ───

export async function rejectCancelShipment(shipId: number, userId?: string) {
  const existing = await prisma.tbShipment.findUnique({ where: { ship_id: shipId } });
  if (!existing) throw new AppError('존재하지 않는 출하입니다.', 404);
  if (existing.status !== 'CANCEL_REQ') throw new AppError('취소요청 상태에서만 거부할 수 있습니다.', 400);

  const shipment = await prisma.tbShipment.update({
    where: { ship_id: shipId },
    data: {
      status: 'SHIPPED',
      cancel_reason: null,
      update_by: userId,
    },
    select: shipmentSelect,
  });

  return toPlain(shipment);
}

// ─── Get Eligible LOTs (SHIPPING PASS, not already allocated to PLAN shipments) ───

export async function getEligibleLots(itemCd?: string) {
  // Get all SHIPPING PASS inspect results with lot_no
  const where: any = {
    inspect_type: 'SHIPPING',
    judge: 'PASS',
    lot_no: { not: null },
  };
  if (itemCd) {
    where.item_cd = itemCd;
  }

  const inspectResults = await prisma.tbInspectResult.findMany({
    where,
    select: {
      inspect_id: true,
      item_cd: true,
      lot_no: true,
      lot: {
        select: {
          lot_qty: true,
          lot_status: true,
          wh_cd: true,
        },
      },
    },
  });

  // Get lot_nos already allocated to PLAN shipments
  const allocatedDetails = await prisma.tbShipmentDtl.findMany({
    where: {
      lot_no: { not: null },
      shipment: { status: 'PLAN' },
    },
    select: { lot_no: true },
  });

  const allocatedLotNos = new Set(allocatedDetails.map((d) => d.lot_no).filter(Boolean));

  // Filter out allocated lots
  const eligible = inspectResults.filter(
    (r) => r.lot_no && !allocatedLotNos.has(r.lot_no),
  );

  return eligible.map((r) => ({
    inspect_id: r.inspect_id,
    item_cd: r.item_cd,
    lot_no: r.lot_no,
    lot_qty: r.lot ? Number(r.lot.lot_qty) : null,
    lot_status: r.lot?.lot_status ?? null,
    wh_cd: r.lot?.wh_cd ?? null,
  }));
}
