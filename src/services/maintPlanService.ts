import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination, buildPaginatedResponse, parseSort, parseFilters } from '../utils';

// ─── Types ───

export interface MaintPlanInput {
  equip_cd: string;
  plan_nm: string;
  maint_type_cd?: string | null;
  cycle_type?: string | null; // DAILY, WEEKLY, MONTHLY, YEARLY
  next_plan_date?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  checklist_items?: Array<{ item_no: number; check_item: string; check_std?: string | null }>;
}

// ─── Create Maintenance Plan ───

export async function createMaintPlan(input: MaintPlanInput, userId?: string) {
  const { checklist_items, ...planData } = input;

  // Verify equipment exists
  const equip = await prisma.tbEquipment.findUnique({ where: { equip_cd: input.equip_cd } });
  if (!equip) throw new AppError('존재하지 않는 설비입니다.', 404);

  return prisma.$transaction(async (tx) => {
    const plan = await tx.tbMaintPlan.create({
      data: {
        equip_cd: planData.equip_cd,
        plan_nm: planData.plan_nm,
        maint_type_cd: planData.maint_type_cd ?? null,
        cycle_type: planData.cycle_type ?? null,
        next_plan_date: planData.next_plan_date ? new Date(planData.next_plan_date) : null,
        assignee_id: planData.assignee_id ?? null,
        description: planData.description ?? null,
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
    });

    if (checklist_items && checklist_items.length > 0) {
      await tx.tbMaintPlanDtl.createMany({
        data: checklist_items.map((item) => ({
          maint_plan_id: plan.maint_plan_id,
          item_no: item.item_no,
          check_item: item.check_item,
          check_std: item.check_std ?? null,
          create_by: userId ?? null,
          update_by: userId ?? null,
        })),
      });
    }

    return tx.tbMaintPlan.findUnique({
      where: { maint_plan_id: plan.maint_plan_id },
      include: {
        plan_dtls: { orderBy: { item_no: 'asc' } },
        equipment: { select: { equip_nm: true } },
        assignee: { select: { worker_nm: true } },
      },
    });
  });
}

// ─── Update Maintenance Plan ───

export async function updateMaintPlan(
  maintPlanId: number,
  input: Partial<MaintPlanInput>,
  userId?: string,
) {
  const existing = await prisma.tbMaintPlan.findUnique({ where: { maint_plan_id: maintPlanId } });
  if (!existing) throw new AppError('존재하지 않는 보전계획입니다.', 404);

  const { checklist_items, ...planData } = input;

  return prisma.$transaction(async (tx) => {
    const updateData: Record<string, any> = {
      update_by: userId ?? null,
      update_dt: new Date(),
    };
    if (planData.plan_nm !== undefined) updateData.plan_nm = planData.plan_nm;
    if (planData.equip_cd !== undefined) updateData.equip_cd = planData.equip_cd;
    if (planData.maint_type_cd !== undefined) updateData.maint_type_cd = planData.maint_type_cd;
    if (planData.cycle_type !== undefined) updateData.cycle_type = planData.cycle_type;
    if (planData.next_plan_date !== undefined)
      updateData.next_plan_date = planData.next_plan_date ? new Date(planData.next_plan_date) : null;
    if (planData.assignee_id !== undefined) updateData.assignee_id = planData.assignee_id;
    if (planData.description !== undefined) updateData.description = planData.description;

    const plan = await tx.tbMaintPlan.update({
      where: { maint_plan_id: maintPlanId },
      data: updateData,
    });

    if (checklist_items !== undefined) {
      // Full replace strategy
      await tx.tbMaintPlanDtl.deleteMany({ where: { maint_plan_id: maintPlanId } });
      if (checklist_items.length > 0) {
        await tx.tbMaintPlanDtl.createMany({
          data: checklist_items.map((item) => ({
            maint_plan_id: plan.maint_plan_id,
            item_no: item.item_no,
            check_item: item.check_item,
            check_std: item.check_std ?? null,
            create_by: userId ?? null,
            update_by: userId ?? null,
          })),
        });
      }
    }

    return tx.tbMaintPlan.findUnique({
      where: { maint_plan_id: maintPlanId },
      include: {
        plan_dtls: { orderBy: { item_no: 'asc' } },
        equipment: { select: { equip_nm: true } },
        assignee: { select: { worker_nm: true } },
      },
    });
  });
}

// ─── Get Maintenance Plan by ID ───

export async function getMaintPlanById(maintPlanId: number) {
  const plan = await prisma.tbMaintPlan.findUnique({
    where: { maint_plan_id: maintPlanId },
    include: {
      plan_dtls: { orderBy: { item_no: 'asc' } },
      equipment: { select: { equip_nm: true } },
      assignee: { select: { worker_nm: true } },
    },
  });
  if (!plan) throw new AppError('존재하지 않는 보전계획입니다.', 404);
  return plan;
}

// ─── List Maintenance Plans ───

const ALLOWED_FILTER_FIELDS = ['equip_cd', 'maint_type_cd', 'cycle_type'];
const ALLOWED_SORT_FIELDS = ['maint_plan_id', 'equip_cd', 'next_plan_date', 'create_dt'];

export async function listMaintPlans(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FILTER_FIELDS) as Record<string, any>;
  const orderBy = parseSort(req, ALLOWED_SORT_FIELDS);

  // Date range filters
  const { next_plan_date_from, next_plan_date_to } = req.query as Record<string, string>;
  if (next_plan_date_from || next_plan_date_to) {
    where.next_plan_date = {};
    if (next_plan_date_from) where.next_plan_date.gte = new Date(next_plan_date_from);
    if (next_plan_date_to) where.next_plan_date.lte = new Date(next_plan_date_to);
  }

  const [total, plans] = await Promise.all([
    prisma.tbMaintPlan.count({ where }),
    prisma.tbMaintPlan.findMany({
      where,
      include: {
        equipment: { select: { equip_nm: true } },
        assignee: { select: { worker_nm: true } },
        plan_dtls: { select: { plan_dtl_id: true } },
      },
      orderBy: orderBy.length > 0 ? orderBy : [{ maint_plan_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(plans, total, page, limit);
}

// ─── Delete Maintenance Plan ───

export async function deleteMaintPlan(maintPlanId: number) {
  const existing = await prisma.tbMaintPlan.findUnique({ where: { maint_plan_id: maintPlanId } });
  if (!existing) throw new AppError('존재하지 않는 보전계획입니다.', 404);

  // Check linked results
  const linkedResults = await prisma.tbMaintResult.count({ where: { maint_plan_id: maintPlanId } });
  if (linkedResults > 0) {
    throw new AppError('연결된 보전이력이 있어 삭제할 수 없습니다.', 409);
  }

  return prisma.$transaction(async (tx) => {
    await tx.tbMaintPlanDtl.deleteMany({ where: { maint_plan_id: maintPlanId } });
    await tx.tbMaintPlan.delete({ where: { maint_plan_id: maintPlanId } });
    return { message: '보전계획이 삭제되었습니다.' };
  });
}

// ─── Get Today's Plan Count (D-08) ───

export async function getTodayPlanCount(): Promise<{ count: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.tbMaintPlan.count({
    where: {
      next_plan_date: { gte: today, lt: tomorrow },
    },
  });
  return { count };
}

// ─── Get Plans for Date Range (Calendar view) ───

export async function getPlansForDateRange(
  startDate: string,
  endDate: string,
  equipCd?: string,
) {
  const where: Record<string, any> = {
    next_plan_date: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };
  if (equipCd) where.equip_cd = equipCd;

  const plans = await prisma.tbMaintPlan.findMany({
    where,
    include: {
      equipment: { select: { equip_nm: true } },
      assignee: { select: { worker_nm: true } },
    },
    orderBy: { next_plan_date: 'asc' },
  });
  return plans;
}
