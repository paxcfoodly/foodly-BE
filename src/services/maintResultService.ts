import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination, buildPaginatedResponse, parseSort, parseFilters } from '../utils';
import { generateNumberWithDateReset } from './numberingService';

// ─── Types ───

export interface MaintResultInput {
  equip_cd: string;
  maint_plan_id?: number | null;
  maint_type_cd?: string | null;
  work_dt?: string | null;
  worker_id?: string | null;
  cost?: number | null;
  memo?: string | null;
  replaced_parts?: Array<{ part_nm: string; qty: number; cost?: number | null }> | null;
  checklist_results?: Array<{
    plan_dtl_id?: number | null;
    check_item: string;
    check_result: string;
    memo?: string | null;
  }>;
}

const VALID_CHECK_RESULTS = ['OK', 'ACTION_NEEDED', 'REPLACED'];

// ─── Calc Next Plan Date (D-09) ───

function calcNextPlanDate(completedDate: Date, cycleType: string): Date {
  const next = new Date(completedDate);
  switch (cycleType) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// ─── Create Maintenance Result ───

export async function createMaintResult(input: MaintResultInput, userId?: string) {
  const { checklist_results, replaced_parts, ...resultData } = input;

  // Verify equipment exists (T-08-02)
  const equip = await prisma.tbEquipment.findUnique({ where: { equip_cd: input.equip_cd } });
  if (!equip) throw new AppError('존재하지 않는 설비입니다.', 404);

  // Validate check_result values (T-08-02)
  if (checklist_results) {
    for (const cr of checklist_results) {
      if (!VALID_CHECK_RESULTS.includes(cr.check_result)) {
        throw new AppError(
          `check_result는 ${VALID_CHECK_RESULTS.join(', ')} 중 하나여야 합니다.`,
          400,
        );
      }
    }
  }

  // Generate maint_no BEFORE transaction to avoid deadlock (per Phase 6 pattern)
  const maint_no = await generateNumberWithDateReset('MAINTENANCE');

  const workDate = resultData.work_dt ? new Date(resultData.work_dt) : new Date();

  return prisma.$transaction(async (tx) => {
    // Create TbMaintResult
    const result = await tx.tbMaintResult.create({
      data: {
        equip_cd: resultData.equip_cd,
        maint_no,
        maint_plan_id: resultData.maint_plan_id ?? null,
        maint_type_cd: resultData.maint_type_cd ?? null,
        work_dt: workDate,
        worker_id: resultData.worker_id ?? null,
        cost: resultData.cost != null ? resultData.cost : null,
        memo: resultData.memo ?? null,
        replaced_parts: replaced_parts ?? undefined,
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
    });

    // Create checklist result items
    if (checklist_results && checklist_results.length > 0) {
      await tx.tbMaintResultDtl.createMany({
        data: checklist_results.map((cr) => ({
          maint_result_id: result.maint_result_id,
          plan_dtl_id: cr.plan_dtl_id ?? null,
          check_item: cr.check_item,
          check_result: cr.check_result,
          memo: cr.memo ?? null,
          create_by: userId ?? null,
          update_by: userId ?? null,
        })),
      });
    }

    // Auto-update next_plan_date on linked plan (D-09)
    if (resultData.maint_plan_id) {
      const plan = await tx.tbMaintPlan.findUnique({
        where: { maint_plan_id: resultData.maint_plan_id },
        select: { cycle_type: true },
      });
      if (plan?.cycle_type) {
        const nextDate = calcNextPlanDate(workDate, plan.cycle_type);
        await tx.tbMaintPlan.update({
          where: { maint_plan_id: resultData.maint_plan_id },
          data: {
            next_plan_date: nextDate,
            update_by: userId ?? null,
            update_dt: new Date(),
          },
        });
      }
    }

    return tx.tbMaintResult.findUnique({
      where: { maint_result_id: result.maint_result_id },
      include: {
        result_dtls: true,
        equipment: { select: { equip_nm: true } },
        worker: { select: { worker_nm: true } },
        maint_plan: { select: { plan_nm: true } },
      },
    });
  });
}

// ─── List Maintenance Results ───

const ALLOWED_FILTER_FIELDS = ['equip_cd', 'maint_type_cd', 'worker_id'];
const ALLOWED_SORT_FIELDS = ['maint_result_id', 'equip_cd', 'work_dt', 'create_dt'];

export async function listMaintResults(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FILTER_FIELDS) as Record<string, any>;
  const orderBy = parseSort(req, ALLOWED_SORT_FIELDS);

  // maint_plan_id (int) — accepted as plain query param since parseFilters defaults to string contains
  const { maint_plan_id } = req.query as Record<string, string>;
  if (maint_plan_id) {
    const pid = Number(maint_plan_id);
    if (Number.isFinite(pid)) where.maint_plan_id = pid;
  }

  // Date range filter
  const { work_dt_from, work_dt_to } = req.query as Record<string, string>;
  if (work_dt_from || work_dt_to) {
    where.work_dt = {};
    if (work_dt_from) where.work_dt.gte = new Date(work_dt_from);
    if (work_dt_to) where.work_dt.lte = new Date(work_dt_to);
  }

  const [total, results] = await Promise.all([
    prisma.tbMaintResult.count({ where }),
    prisma.tbMaintResult.findMany({
      where,
      include: {
        equipment: { select: { equip_nm: true } },
        worker: { select: { worker_nm: true } },
        result_dtls: true,
        maint_plan: { select: { plan_nm: true } },
      },
      orderBy: orderBy.length > 0 ? orderBy : [{ maint_result_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(results, total, page, limit);
}

// ─── Get Maintenance Result by ID ───

export async function getMaintResultById(resultId: number) {
  const result = await prisma.tbMaintResult.findUnique({
    where: { maint_result_id: resultId },
    include: {
      result_dtls: {
        include: { plan_dtl: true },
      },
      equipment: { select: { equip_nm: true } },
      worker: { select: { worker_nm: true } },
      maint_plan: { select: { plan_nm: true, cycle_type: true } },
    },
  });
  if (!result) throw new AppError('존재하지 않는 보전실적입니다.', 404);
  return result;
}

// ─── Delete Maintenance Result ───

export async function deleteMaintResult(resultId: number) {
  const existing = await prisma.tbMaintResult.findUnique({ where: { maint_result_id: resultId } });
  if (!existing) throw new AppError('존재하지 않는 보전실적입니다.', 404);

  return prisma.$transaction(async (tx) => {
    await tx.tbMaintResultDtl.deleteMany({ where: { maint_result_id: resultId } });
    await tx.tbMaintResult.delete({ where: { maint_result_id: resultId } });
    return { message: '보전실적이 삭제되었습니다.' };
  });
}
