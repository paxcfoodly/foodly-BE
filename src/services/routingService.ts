import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

// ─── List routings by item_cd ───

export async function listRoutingsByItem(itemCd: string) {
  const routings = await prisma.tbRouting.findMany({
    where: { item_cd: itemCd },
    include: {
      process: {
        select: { process_nm: true },
      },
    },
    orderBy: { seq_no: 'asc' },
  });
  return routings;
}

// ─── Bulk set routings for an item (delete-recreate in transaction) ───

export interface RoutingEntry {
  process_cd: string;
  seq_no: number;
  std_time?: number | null;
  setup_time?: number | null;
  use_yn?: string;
}

export async function bulkSetRoutings(itemCd: string, routings: RoutingEntry[], userId?: string) {
  // Verify item exists
  const item = await prisma.tbItem.findUnique({ where: { item_cd: itemCd } });
  if (!item) throw new AppError('존재하지 않는 품목입니다.', 404);

  const result = await prisma.$transaction(async (tx) => {
    // Delete all existing routings for this item
    await tx.tbRouting.deleteMany({ where: { item_cd: itemCd } });

    // Recreate with new seq_no values
    if (routings.length > 0) {
      await tx.tbRouting.createMany({
        data: routings.map((r) => ({
          item_cd: itemCd,
          process_cd: r.process_cd,
          seq_no: r.seq_no,
          std_time: r.std_time ?? null,
          setup_time: r.setup_time ?? null,
          use_yn: r.use_yn ?? 'Y',
          create_by: userId ?? null,
          update_by: userId ?? null,
        })),
      });
    }

    // Return the new list
    return tx.tbRouting.findMany({
      where: { item_cd: itemCd },
      include: { process: { select: { process_nm: true } } },
      orderBy: { seq_no: 'asc' },
    });
  });

  return result;
}

// ─── Create single routing ───

export interface RoutingCreateInput {
  item_cd: string;
  process_cd: string;
  seq_no: number;
  std_time?: number | null;
  setup_time?: number | null;
  use_yn?: string;
}

export async function createRouting(input: RoutingCreateInput, userId?: string) {
  const routing = await prisma.tbRouting.create({
    data: {
      item_cd: input.item_cd,
      process_cd: input.process_cd,
      seq_no: input.seq_no,
      std_time: input.std_time ?? null,
      setup_time: input.setup_time ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    include: { process: { select: { process_nm: true } } },
  });
  return routing;
}

// ─── Update routing ───

export interface RoutingUpdateInput {
  process_cd?: string;
  seq_no?: number;
  std_time?: number | null;
  setup_time?: number | null;
  use_yn?: string;
}

export async function updateRouting(routingId: number, input: RoutingUpdateInput, userId?: string) {
  const existing = await prisma.tbRouting.findUnique({ where: { routing_id: routingId } });
  if (!existing) throw new AppError('존재하지 않는 라우팅입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.process_cd !== undefined) data.process_cd = input.process_cd;
  if (input.seq_no !== undefined) data.seq_no = input.seq_no;
  if (input.std_time !== undefined) data.std_time = input.std_time;
  if (input.setup_time !== undefined) data.setup_time = input.setup_time;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbRouting.update({
    where: { routing_id: routingId },
    data: data as any,
    include: { process: { select: { process_nm: true } } },
  });
  return updated;
}

// ─── Delete routing ───

export async function deleteRouting(routingId: number) {
  const existing = await prisma.tbRouting.findUnique({ where: { routing_id: routingId } });
  if (!existing) throw new AppError('존재하지 않는 라우팅입니다.', 404);

  await prisma.tbRouting.delete({ where: { routing_id: routingId } });
  return { message: '라우팅이 삭제되었습니다.' };
}
