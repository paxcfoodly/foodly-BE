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
const ALLOWED_FIELDS = ['inspect_no', 'inspect_type', 'item_cd', 'lot_no', 'judge'];

const inspectResultSelect = {
  inspect_id: true,
  inspect_no: true,
  inspect_type: true,
  item_cd: true,
  lot_no: true,
  wo_id: true,
  process_cd: true,
  judge: true,
  remark: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true } },
  lot: { select: { lot_status: true } },
  work_order: { select: { wo_no: true } },
  process: { select: { process_nm: true } },
  details: {
    select: {
      inspect_dtl_id: true,
      inspect_id: true,
      inspect_std_id: true,
      measure_value: true,
      judge: true,
      inspect_std: {
        select: {
          inspect_item_nm: true,
          measure_type: true,
          lsl: true,
          target_val: true,
          usl: true,
          unit: true,
        },
      },
    },
  },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    details: row.details?.map((d: any) => ({
      ...d,
      measure_value: d.measure_value != null ? Number(d.measure_value) : null,
      inspect_std: d.inspect_std
        ? {
            ...d.inspect_std,
            lsl: d.inspect_std.lsl != null ? Number(d.inspect_std.lsl) : null,
            target_val: d.inspect_std.target_val != null ? Number(d.inspect_std.target_val) : null,
            usl: d.inspect_std.usl != null ? Number(d.inspect_std.usl) : null,
          }
        : null,
    })),
  };
}

/** Auto-judge a single measurement against LSL/USL */
function autoJudge(measureValue: number | null, lsl: number | null, usl: number | null): string {
  if (measureValue == null) return 'PASS'; // Visual check = OK
  if (lsl != null && measureValue < lsl) return 'FAIL';
  if (usl != null && measureValue > usl) return 'FAIL';
  return 'PASS';
}

// ─── List (paginated + filtered + sorted) ───

export async function listInspectResults(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS) as any;
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  // Additional filter for inspect_type query param
  if (req.query.inspect_type) {
    where.inspect_type = req.query.inspect_type as string;
  }

  const [total, results] = await Promise.all([
    prisma.tbInspectResult.count({ where }),
    prisma.tbInspectResult.findMany({
      where,
      select: inspectResultSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ inspect_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(results.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getInspectResultById(inspectId: number) {
  const result = await prisma.tbInspectResult.findUnique({
    where: { inspect_id: inspectId },
    select: inspectResultSelect,
  });
  if (!result) throw new AppError('존재하지 않는 검사결과입니다.', 404);
  return toPlain(result);
}

// ─── Get Standards for Inspection (for FE form population) ───

export async function getStandardsForInspection(
  itemCd: string,
  inspectType: string,
  processCd?: string | null,
) {
  const where: any = {
    item_cd: itemCd,
    inspect_type: inspectType,
    use_yn: 'Y',
  };
  if (processCd) {
    where.process_cd = processCd;
  }

  const standards = await prisma.tbInspectStd.findMany({
    where,
    select: {
      inspect_std_id: true,
      inspect_item_nm: true,
      measure_type: true,
      lsl: true,
      target_val: true,
      usl: true,
      unit: true,
      sampling_std: true,
    },
    orderBy: [{ inspect_std_id: 'asc' }],
  });

  return standards.map((s) => ({
    ...s,
    lsl: s.lsl != null ? Number(s.lsl) : null,
    target_val: s.target_val != null ? Number(s.target_val) : null,
    usl: s.usl != null ? Number(s.usl) : null,
  }));
}

// ─── Create ───

export interface InspectResultCreateInput {
  inspect_type: string; // 'PROCESS' or 'SHIPPING'
  item_cd: string;
  lot_no: string;
  wo_id?: number | null;       // required for PROCESS, null for SHIPPING
  process_cd?: string | null;  // required for PROCESS, null for SHIPPING
  remark?: string | null;
  details: Array<{
    inspect_std_id: number;
    measure_value: number | null;
  }>;
}

export async function createInspectResult(input: InspectResultCreateInput, userId?: string) {
  if (!input.details || input.details.length === 0) {
    throw new AppError('검사 항목은 1건 이상이어야 합니다.', 400);
  }

  // Generate number OUTSIDE transaction (deadlock prevention)
  const inspect_no = await generateNumberWithDateReset('INSPECTION');

  const result = await prisma.$transaction(async (tx) => {
    // a. Create header
    const header = await tx.tbInspectResult.create({
      data: {
        inspect_no,
        inspect_type: input.inspect_type,
        item_cd: input.item_cd,
        lot_no: input.lot_no,
        wo_id: input.wo_id ?? null,
        process_cd: input.process_cd ?? null,
        remark: input.remark ?? null,
        judge: 'PASS', // temporary, will be updated below
        create_by: userId,
        update_by: userId,
      },
    });

    // b. For each detail: fetch TbInspectStd to get lsl/usl, call autoJudge, create TbInspectResultDtl
    let overallFail = false;
    for (const dtl of input.details) {
      const std = await tx.tbInspectStd.findUnique({
        where: { inspect_std_id: dtl.inspect_std_id },
        select: { lsl: true, usl: true },
      });

      const lsl = std?.lsl != null ? Number(std.lsl) : null;
      const usl = std?.usl != null ? Number(std.usl) : null;
      const detailJudge = autoJudge(dtl.measure_value, lsl, usl);

      if (detailJudge === 'FAIL') overallFail = true;

      await tx.tbInspectResultDtl.create({
        data: {
          inspect_id: header.inspect_id,
          inspect_std_id: dtl.inspect_std_id,
          measure_value: dtl.measure_value,
          judge: detailJudge,
          create_by: userId,
          update_by: userId,
        },
      });
    }

    // c. Determine overall judge
    const overallJudge = overallFail ? 'FAIL' : 'PASS';

    // d. Update header with overall judge
    await tx.tbInspectResult.update({
      where: { inspect_id: header.inspect_id },
      data: { judge: overallJudge, update_by: userId },
    });

    // e. Per D-11: If overall judge is 'FAIL' AND lot_no is present, update TbLot to QUARANTINE
    if (overallJudge === 'FAIL' && input.lot_no) {
      await tx.tbLot.updateMany({
        where: { lot_no: input.lot_no },
        data: { lot_status: 'QUARANTINE', update_by: userId },
      });
    }

    return tx.tbInspectResult.findUnique({
      where: { inspect_id: header.inspect_id },
      select: inspectResultSelect,
    });
  });

  return toPlain(result);
}

// ─── Delete ───

export async function deleteInspectResult(inspectId: number) {
  const existing = await prisma.tbInspectResult.findUnique({
    where: { inspect_id: inspectId },
  });
  if (!existing) throw new AppError('존재하지 않는 검사결과입니다.', 404);

  await prisma.$transaction(async (tx) => {
    await tx.tbInspectResultDtl.deleteMany({ where: { inspect_id: inspectId } });
    await tx.tbInspectResult.delete({ where: { inspect_id: inspectId } });
  });

  return { deleted: true };
}
