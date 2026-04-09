import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
} from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['item_cd', 'lot_no', 'wh_cd'];

const inventorySelect = {
  inventory_id: true,
  item_cd: true,
  lot_no: true,
  wh_cd: true,
  qty: true,
  allocated_qty: true,
  available_qty: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true } },
  lot: { select: { lot_status: true } },
  warehouse: { select: { wh_nm: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    qty: row.qty != null ? Number(row.qty) : 0,
    allocated_qty: row.allocated_qty != null ? Number(row.allocated_qty) : 0,
    available_qty: row.available_qty != null ? Number(row.available_qty) : 0,
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listInventory(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, items] = await Promise.all([
    prisma.tbInventory.count({ where: where as any }),
    prisma.tbInventory.findMany({
      where: where as any,
      select: inventorySelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ inventory_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(items.map(toPlain), total, page, limit);
}

// ─── Adjust Inventory ───

export interface InventoryAdjustInput {
  item_cd: string;
  lot_no?: string | null;
  wh_cd: string;
  adjust_qty: number;
  adjust_reason?: string;
}

export async function adjustInventory(input: InventoryAdjustInput, userId?: string) {
  if (input.adjust_qty === 0) {
    throw new AppError('조정수량은 0이 아니어야 합니다.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Find inventory record
    const inv = await tx.tbInventory.findFirst({
      where: {
        item_cd: input.item_cd,
        lot_no: input.lot_no ?? null,
        wh_cd: input.wh_cd,
      },
    });

    if (!inv) {
      throw new AppError(`재고가 존재하지 않습니다: ${input.item_cd} / ${input.lot_no ?? '-'} / ${input.wh_cd}`, 404);
    }

    const beforeQty = Number(inv.qty);
    const afterQty = beforeQty + input.adjust_qty;

    if (afterQty < 0) {
      throw new AppError(`조정 후 재고가 음수가 됩니다: 현재 ${beforeQty}, 조정 ${input.adjust_qty}`, 400);
    }

    // Update inventory
    await tx.tbInventory.update({
      where: { inventory_id: inv.inventory_id },
      data: {
        qty: afterQty,
        available_qty: Number(inv.available_qty) + input.adjust_qty,
        update_by: userId,
      },
    });

    // Create adjust record
    await tx.tbInventoryAdjust.create({
      data: {
        item_cd: input.item_cd,
        lot_no: input.lot_no ?? null,
        adjust_qty: input.adjust_qty,
        adjust_reason: input.adjust_reason ?? null,
        create_by: userId,
        update_by: userId,
      },
    });

    // Log inventory transaction
    await tx.tbInventoryTx.create({
      data: {
        item_cd: input.item_cd,
        lot_no: input.lot_no ?? null,
        tx_type: 'ADJUST',
        tx_qty: input.adjust_qty,
        before_qty: beforeQty,
        after_qty: afterQty,
        create_by: userId,
      },
    });

    return tx.tbInventory.findUnique({
      where: { inventory_id: inv.inventory_id },
      select: inventorySelect,
    });
  });

  return toPlain(result);
}
