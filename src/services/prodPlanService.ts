import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logDataChanges } from './dataHistoryService';
import { generateNumberWithDateReset } from './numberingService';
import { getForwardTree } from './bomService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
} from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['plan_no', 'plant_cd', 'item_cd', 'status', 'due_date', 'priority'];

const prodPlanSelect = {
  plan_id: true,
  plan_no: true,
  plant_cd: true,
  item_cd: true,
  plan_qty: true,
  due_date: true,
  priority: true,
  status: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true } },
  plant: { select: { plant_nm: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    plan_qty: row.plan_qty != null ? Number(row.plan_qty) : null,
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listProdPlans(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, plans] = await Promise.all([
    prisma.tbProdPlan.count({ where: where as any }),
    prisma.tbProdPlan.findMany({
      where: where as any,
      select: prodPlanSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ plan_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(plans.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getProdPlanById(planId: number) {
  const plan = await prisma.tbProdPlan.findUnique({
    where: { plan_id: planId },
    select: prodPlanSelect,
  });
  if (!plan) throw new AppError('존재하지 않는 생산계획입니다.', 404);
  return toPlain(plan);
}

// ─── Create ───

export interface ProdPlanCreateInput {
  plant_cd: string;
  item_cd: string;
  plan_qty: number;
  due_date: string;
  priority?: number;
}

export async function createProdPlan(input: ProdPlanCreateInput, userId?: string) {
  // Validate FK: plant
  const plant = await prisma.tbPlant.findUnique({ where: { plant_cd: input.plant_cd } });
  if (!plant) throw new AppError('존재하지 않는 공장코드입니다.', 400);

  // Validate FK: item
  const item = await prisma.tbItem.findUnique({ where: { item_cd: input.item_cd } });
  if (!item) throw new AppError('존재하지 않는 품목코드입니다.', 400);

  // Auto-generate plan_no
  const plan_no = await generateNumberWithDateReset('PROD_PLAN');

  const plan = await prisma.tbProdPlan.create({
    data: {
      plan_no,
      plant_cd: input.plant_cd,
      item_cd: input.item_cd,
      plan_qty: input.plan_qty,
      due_date: new Date(input.due_date),
      priority: input.priority ?? 5,
      status: 'PLAN',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: prodPlanSelect,
  });

  return toPlain(plan);
}

// ─── Update ───

export interface ProdPlanUpdateInput {
  plant_cd?: string;
  item_cd?: string;
  plan_qty?: number;
  due_date?: string;
  priority?: number;
  status?: string;
}

export async function updateProdPlan(planId: number, input: ProdPlanUpdateInput, userId?: string) {
  const existing = await prisma.tbProdPlan.findUnique({
    where: { plan_id: planId },
    select: prodPlanSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 생산계획입니다.', 404);

  // Block edit after PLAN status (CONFIRMED, PROGRESS, COMPLETE, CANCEL)
  if (existing.status !== 'PLAN') {
    throw new AppError('확정 이후에는 생산계획을 수정할 수 없습니다.', 409);
  }

  // Build update data — only provided fields
  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.plant_cd !== undefined) data.plant_cd = input.plant_cd;
  if (input.item_cd !== undefined) data.item_cd = input.item_cd;
  if (input.plan_qty !== undefined) data.plan_qty = input.plan_qty;
  if (input.due_date !== undefined) data.due_date = new Date(input.due_date);
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.tbProdPlan.update({
    where: { plan_id: planId },
    data: data as any,
    select: prodPlanSelect,
  });

  // Log data changes (non-blocking)
  logDataChanges(
    'tb_prod_plan',
    String(planId),
    toPlain(existing),
    toPlain(updated),
    null,
    userId,
  );

  return toPlain(updated);
}

// ─── Delete ───

export async function deleteProdPlan(planId: number) {
  const existing = await prisma.tbProdPlan.findUnique({ where: { plan_id: planId } });
  if (!existing) throw new AppError('존재하지 않는 생산계획입니다.', 404);

  // Block delete after PLAN status
  if (existing.status !== 'PLAN') {
    throw new AppError('확정 이후에는 생산계획을 삭제할 수 없습니다.', 409);
  }

  try {
    await prisma.tbProdPlan.delete({ where: { plan_id: planId } });
    return { message: '생산계획이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('작업지시 등 다른 데이터에서 참조 중이므로 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Material Availability Check ───

export async function checkMaterialAvailability(planId: number) {
  const plan = await prisma.tbProdPlan.findUnique({
    where: { plan_id: planId },
    select: { plan_id: true, plan_no: true, item_cd: true, plan_qty: true },
  });
  if (!plan) throw new AppError('존재하지 않는 생산계획입니다.', 404);

  const planQty = Number(plan.plan_qty ?? 0);

  // BOM forward explosion to get required child materials
  const bomTree = await getForwardTree(plan.item_cd);

  // Aggregate only leaf-level children (direct BOM components)
  // Each row has child_item_cd, qty (per-unit), loss_rate
  const materialMap = new Map<string, { itemCd: string; itemNm: string; requiredQty: number }>();

  for (const row of bomTree) {
    const qty = Number(row.qty ?? 0);
    const lossRate = Number(row.loss_rate ?? 0);
    const required = qty * planQty * (1 + lossRate / 100);
    const childCd = row.child_item_cd as string;
    const childNm = (row.child_item_nm as string) ?? childCd;

    const existing = materialMap.get(childCd);
    if (existing) {
      existing.requiredQty += required;
    } else {
      materialMap.set(childCd, { itemCd: childCd, itemNm: childNm, requiredQty: required });
    }
  }

  // For each material, check available inventory
  const materials = await Promise.all(
    Array.from(materialMap.values()).map(async (mat) => {
      const agg = await prisma.tbInventory.aggregate({
        where: { item_cd: mat.itemCd },
        _sum: { available_qty: true },
      });
      const availableQty = Number(agg._sum.available_qty ?? 0);
      const shortage = Math.max(0, mat.requiredQty - availableQty);
      return {
        itemCd: mat.itemCd,
        itemNm: mat.itemNm,
        requiredQty: Math.round(mat.requiredQty * 1000) / 1000,
        availableQty: Math.round(availableQty * 1000) / 1000,
        shortage: Math.round(shortage * 1000) / 1000,
      };
    }),
  );

  return {
    planId: plan.plan_id,
    planNo: plan.plan_no,
    itemCd: plan.item_cd,
    materials,
  };
}

// ─── Confirm Plan ───

export async function confirmPlan(planId: number, userId?: string) {
  const existing = await prisma.tbProdPlan.findUnique({
    where: { plan_id: planId },
    select: prodPlanSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 생산계획입니다.', 404);

  if (existing.status !== 'PLAN') {
    throw new AppError('계획(PLAN) 상태에서만 확정할 수 있습니다.', 409);
  }

  const updated = await prisma.tbProdPlan.update({
    where: { plan_id: planId },
    data: {
      status: 'CONFIRMED',
      update_by: userId ?? null,
      update_dt: new Date(),
    },
    select: prodPlanSelect,
  });

  // Log data changes
  logDataChanges(
    'tb_prod_plan',
    String(planId),
    toPlain(existing),
    toPlain(updated),
    null,
    userId,
  );

  return toPlain(updated);
}
