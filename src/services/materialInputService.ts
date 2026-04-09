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
const ALLOWED_FIELDS = ['wo_id', 'item_cd', 'lot_no', 'worker_id'];

const materialInputSelect = {
  input_id: true,
  wo_id: true,
  item_cd: true,
  lot_no: true,
  input_qty: true,
  worker_id: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  work_order: { select: { wo_no: true } },
  item: { select: { item_nm: true } },
  lot: { select: { lot_no: true } },
  worker: { select: { worker_nm: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    input_qty: row.input_qty != null ? Number(row.input_qty) : 0,
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listMaterialInputs(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, results] = await Promise.all([
    prisma.tbMaterialInput.count({ where: where as any }),
    prisma.tbMaterialInput.findMany({
      where: where as any,
      select: materialInputSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ input_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(results.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getMaterialInputById(inputId: number) {
  const result = await prisma.tbMaterialInput.findUnique({
    where: { input_id: inputId },
    select: materialInputSelect,
  });
  if (!result) throw new AppError('존재하지 않는 자재투입입니다.', 404);
  return toPlain(result);
}

// ─── Create ───

export interface MaterialInputCreateInput {
  wo_id: number;
  item_cd: string;
  lot_no?: string | null;
  input_qty: number;
  worker_id?: string | null;
}

export async function createMaterialInput(input: MaterialInputCreateInput, loginId?: string) {
  // Validate FK: work order exists
  const wo = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: input.wo_id },
    select: { wo_id: true },
  });
  if (!wo) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Validate FK: item exists
  const item = await prisma.tbItem.findUnique({
    where: { item_cd: input.item_cd },
    select: { item_cd: true },
  });
  if (!item) throw new AppError('존재하지 않는 품목입니다.', 404);

  // Validate FK: lot exists (if provided)
  if (input.lot_no) {
    const lot = await prisma.tbLot.findUnique({
      where: { lot_no: input.lot_no },
      select: { lot_no: true },
    });
    if (!lot) throw new AppError('존재하지 않는 LOT입니다.', 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.tbMaterialInput.create({
      data: {
        wo_id: input.wo_id,
        item_cd: input.item_cd,
        lot_no: input.lot_no ?? null,
        input_qty: input.input_qty,
        worker_id: input.worker_id ?? null,
        create_by: loginId ?? null,
        update_by: loginId ?? null,
      },
      select: materialInputSelect,
    });

    // Log LOT history with CONSUME event if lot_no is provided
    if (input.lot_no) {
      await tx.tbLotHistory.create({
        data: {
          lot_no: input.lot_no,
          event_type: 'CONSUME',
          event_detail: `자재투입 (WO: ${input.wo_id}, 품목: ${input.item_cd})`,
          qty: input.input_qty,
          create_by: loginId ?? null,
        },
      });
    }

    return created;
  });

  return toPlain(result);
}

// ─── Delete ───

export async function deleteMaterialInput(inputId: number) {
  const existing = await prisma.tbMaterialInput.findUnique({
    where: { input_id: inputId },
    select: { input_id: true },
  });
  if (!existing) throw new AppError('존재하지 않는 자재투입입니다.', 404);

  await prisma.tbMaterialInput.delete({ where: { input_id: inputId } });

  return { message: '자재투입이 삭제되었습니다.' };
}
