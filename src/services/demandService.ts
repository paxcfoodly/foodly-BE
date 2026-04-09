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
const ALLOWED_FIELDS = ['demand_no', 'cust_cd', 'item_cd', 'status', 'due_date'];

const demandSelect = {
  demand_id: true,
  demand_no: true,
  cust_cd: true,
  item_cd: true,
  demand_qty: true,
  due_date: true,
  status: true,
  remark: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true } },
  customer: { select: { cust_nm: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    demand_qty: row.demand_qty != null ? Number(row.demand_qty) : null,
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listDemands(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, demands] = await Promise.all([
    prisma.tbDemand.count({ where: where as any }),
    prisma.tbDemand.findMany({
      where: where as any,
      select: demandSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ demand_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(demands.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getDemand(demandId: number) {
  const demand = await prisma.tbDemand.findUnique({
    where: { demand_id: demandId },
    select: demandSelect,
  });
  if (!demand) throw new AppError('존재하지 않는 수요입니다.', 404);
  return toPlain(demand);
}

// ─── Create ───

export interface DemandCreateInput {
  item_cd: string;
  demand_qty: number;
  due_date?: string;
  cust_cd?: string;
  remark?: string;
}

export async function createDemand(data: DemandCreateInput, userId?: string) {
  if (!data.item_cd || data.demand_qty == null) {
    throw new AppError('item_cd, demand_qty는 필수 항목입니다.', 400);
  }

  // Validate FK: item
  const item = await prisma.tbItem.findUnique({ where: { item_cd: data.item_cd } });
  if (!item) throw new AppError('존재하지 않는 품목코드입니다.', 400);

  // Validate FK: customer (optional)
  if (data.cust_cd) {
    const customer = await prisma.tbCustomer.findUnique({ where: { cust_cd: data.cust_cd } });
    if (!customer) throw new AppError('존재하지 않는 거래처코드입니다.', 400);
  }

  const demand_no = await generateNumberWithDateReset('DEMAND');

  const demand = await prisma.tbDemand.create({
    data: {
      demand_no,
      item_cd: data.item_cd,
      demand_qty: data.demand_qty,
      due_date: data.due_date ? new Date(data.due_date) : null,
      cust_cd: data.cust_cd ?? null,
      remark: data.remark ?? null,
      status: 'OPEN',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: demandSelect,
  });

  return toPlain(demand);
}

// ─── Update ───

export interface DemandUpdateInput {
  item_cd?: string;
  demand_qty?: number;
  due_date?: string | null;
  cust_cd?: string | null;
  remark?: string | null;
  status?: string;
}

export async function updateDemand(demandId: number, data: DemandUpdateInput, userId?: string) {
  const existing = await prisma.tbDemand.findUnique({ where: { demand_id: demandId } });
  if (!existing) throw new AppError('존재하지 않는 수요입니다.', 404);

  if (existing.status === 'CLOSED') {
    throw new AppError('마감된 수요는 수정할 수 없습니다.', 409);
  }

  const updated = await prisma.tbDemand.update({
    where: { demand_id: demandId },
    data: {
      ...(data.item_cd !== undefined && { item_cd: data.item_cd }),
      ...(data.demand_qty !== undefined && { demand_qty: data.demand_qty }),
      ...(data.due_date !== undefined && { due_date: data.due_date ? new Date(data.due_date) : null }),
      ...(data.cust_cd !== undefined && { cust_cd: data.cust_cd }),
      ...(data.remark !== undefined && { remark: data.remark }),
      ...(data.status !== undefined && { status: data.status }),
      update_by: userId ?? null,
    },
    select: demandSelect,
  });

  return toPlain(updated);
}

// ─── Delete ───

export async function deleteDemand(demandId: number) {
  const existing = await prisma.tbDemand.findUnique({ where: { demand_id: demandId } });
  if (!existing) throw new AppError('존재하지 않는 수요입니다.', 404);

  if (existing.status === 'PLANNED') {
    throw new AppError('생산계획이 연결된 수요는 삭제할 수 없습니다.', 409);
  }

  if (existing.status === 'CLOSED') {
    throw new AppError('완료된 수요는 삭제할 수 없습니다.', 409);
  }

  try {
    await prisma.tbDemand.delete({ where: { demand_id: demandId } });
    return { message: '수요가 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('다른 데이터에서 참조 중이므로 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Create Draft Plan from Demand ───

export interface CreateDraftPlanInput {
  plant_cd: string;
  plan_qty?: number;
  due_date?: string;
}

export async function createDraftPlanFromDemand(
  demandId: number,
  body: CreateDraftPlanInput,
  userId?: string,
) {
  if (!body.plant_cd) {
    throw new AppError('plant_cd는 필수 항목입니다.', 400);
  }

  const plan = await prisma.$transaction(async (tx) => {
    // 1. Fetch demand (lock via transaction)
    const demand = await tx.tbDemand.findUnique({ where: { demand_id: demandId } });
    if (!demand) throw new AppError('존재하지 않는 수요입니다.', 404);

    // 2. Block duplicate plan creation
    if (demand.status === 'PLANNED') {
      throw new AppError('이미 생산계획이 생성된 수요입니다.', 409);
    }

    // 3. Generate plan number (outside tx — numberingService uses its own transaction)
    const plan_no = await generateNumberWithDateReset('PROD_PLAN');

    // 4. Create production plan
    const newPlan = await tx.tbProdPlan.create({
      data: {
        plan_no,
        plant_cd: body.plant_cd,
        item_cd: demand.item_cd,
        plan_qty: body.plan_qty != null ? body.plan_qty : demand.demand_qty,
        due_date: body.due_date ? new Date(body.due_date) : (demand.due_date ?? new Date()),
        status: 'PLAN',
        demand_id: demandId,
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
    });

    // 5. Update demand status to PLANNED
    await tx.tbDemand.update({
      where: { demand_id: demandId },
      data: { status: 'PLANNED', update_by: userId ?? null },
    });

    return newPlan;
  });

  return plan;
}
