import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

// ─── SPC Constants (A2, D3, D4, d2) for subgroup sizes 2-10 ───

const SPC_CONSTANTS: Record<number, { A2: number; D3: number; D4: number; d2: number }> = {
  2:  { A2: 1.880, D3: 0,     D4: 3.267, d2: 1.128 },
  3:  { A2: 1.023, D3: 0,     D4: 2.575, d2: 1.693 },
  4:  { A2: 0.729, D3: 0,     D4: 2.282, d2: 2.059 },
  5:  { A2: 0.577, D3: 0,     D4: 2.115, d2: 2.326 },
  6:  { A2: 0.483, D3: 0,     D4: 2.004, d2: 2.534 },
  7:  { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8:  { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9:  { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
};

// ─── SpcResult Interface ───

export interface SpcResult {
  totalCount: number;
  subgroupSize: number;
  subgroups: Array<{ index: number; mean: number; range: number; values: number[] }>;
  xBar: number;
  rBar: number;
  ucl_xbar: number;
  lcl_xbar: number;
  ucl_r: number;
  lcl_r: number;
  cp: number | null;
  cpk: number | null;
  histogram: Array<{ bin: string; count: number }>;
  lsl: number | null;
  usl: number | null;
}

// ─── calculateSpc ───

export async function calculateSpc(
  inspectStdId: number,
  subgroupSize: number,
  startDate?: Date,
  endDate?: Date,
): Promise<SpcResult> {
  // Validate subgroup size
  if (!SPC_CONSTANTS[subgroupSize]) {
    throw new AppError('지원하지 않는 서브그룹 크기입니다. (2-10)', 400);
  }

  // Fetch inspect standard for LSL/USL
  const std = await prisma.tbInspectStd.findUnique({
    where: { inspect_std_id: inspectStdId },
    select: { lsl: true, usl: true },
  });

  const lsl = std?.lsl != null ? Number(std.lsl) : null;
  const usl = std?.usl != null ? Number(std.usl) : null;

  // Build date range filter
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.create_dt = {};
    if (startDate) dateFilter.create_dt.gte = startDate;
    if (endDate) {
      // Include entire end date
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.create_dt.lte = endOfDay;
    }
  }

  // Fetch measurements
  const details = await prisma.tbInspectResultDtl.findMany({
    where: {
      inspect_std_id: inspectStdId,
      measure_value: { not: null },
      inspect_result: dateFilter.create_dt ? { create_dt: dateFilter.create_dt } : undefined,
    },
    select: {
      measure_value: true,
      inspect_result: { select: { create_dt: true } },
    },
    orderBy: { inspect_result: { create_dt: 'asc' } },
  });

  const measurements = (details as Array<{ measure_value: { toString: () => string } | null }>).map((d) => Number(d.measure_value));
  const totalCount = measurements.length;

  // Insufficient data — FE will show info alert per D-08
  if (totalCount < 25) {
    return {
      totalCount,
      subgroupSize,
      subgroups: [],
      xBar: 0,
      rBar: 0,
      ucl_xbar: 0,
      lcl_xbar: 0,
      ucl_r: 0,
      lcl_r: 0,
      cp: null,
      cpk: null,
      histogram: [],
      lsl,
      usl,
    };
  }

  // ─── Group into subgroups (discard incomplete last subgroup) ───
  const completeGroupCount = Math.floor(totalCount / subgroupSize);
  const subgroups: SpcResult['subgroups'] = [];

  for (let i = 0; i < completeGroupCount; i++) {
    const values = measurements.slice(i * subgroupSize, (i + 1) * subgroupSize);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const range = Math.max(...values) - Math.min(...values);
    subgroups.push({ index: i + 1, mean, range, values });
  }

  // ─── Grand mean and R-bar ───
  const xBar = subgroups.reduce((sum, sg) => sum + sg.mean, 0) / subgroups.length;
  const rBar = subgroups.reduce((sum, sg) => sum + sg.range, 0) / subgroups.length;

  // ─── Control limits ───
  const { A2, D3, D4, d2 } = SPC_CONSTANTS[subgroupSize];
  const ucl_xbar = xBar + A2 * rBar;
  const lcl_xbar = xBar - A2 * rBar;
  const ucl_r = D4 * rBar;
  const lcl_r = D3 * rBar;

  // ─── Cp / Cpk (only if LSL and USL both exist) ───
  let cp: number | null = null;
  let cpk: number | null = null;

  if (lsl !== null && usl !== null) {
    const sigma_hat = rBar / d2;
    if (sigma_hat > 0) {
      cp = (usl - lsl) / (6 * sigma_hat);
      cpk = Math.min(
        (usl - xBar) / (3 * sigma_hat),
        (xBar - lsl) / (3 * sigma_hat),
      );
    }
    // If sigma_hat === 0: cp and cpk remain null (prevent division by zero)
  }

  // ─── Histogram (10 bins) ───
  const allValues = measurements.slice(0, completeGroupCount * subgroupSize);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const BIN_COUNT = 10;
  const histogram: SpcResult['histogram'] = [];

  if (maxVal === minVal) {
    // All values identical — single bin
    histogram.push({ bin: `${minVal.toFixed(2)}-${maxVal.toFixed(2)}`, count: allValues.length });
  } else {
    const binWidth = (maxVal - minVal) / BIN_COUNT;
    for (let i = 0; i < BIN_COUNT; i++) {
      const low = minVal + i * binWidth;
      const high = i === BIN_COUNT - 1 ? maxVal + Number.EPSILON : minVal + (i + 1) * binWidth;
      const count = allValues.filter((v) => v >= low && v < high).length;
      histogram.push({
        bin: `${low.toFixed(2)}-${(high === maxVal + Number.EPSILON ? maxVal : high).toFixed(2)}`,
        count,
      });
    }
  }

  return {
    totalCount,
    subgroupSize,
    subgroups,
    xBar,
    rBar,
    ucl_xbar,
    lcl_xbar,
    ucl_r,
    lcl_r,
    cp,
    cpk,
    histogram,
    lsl,
    usl,
  };
}

// ─── getInspectStdsForSpc ───

export async function getInspectStdsForSpc(itemCd?: string) {
  const where: any = {
    measure_type: '계량',
    use_yn: 'Y',
  };
  if (itemCd) {
    where.item_cd = itemCd;
  }

  const stds = await prisma.tbInspectStd.findMany({
    where,
    select: {
      inspect_std_id: true,
      inspect_item_nm: true,
      item_cd: true,
      lsl: true,
      usl: true,
      unit: true,
    },
    orderBy: [{ inspect_std_id: 'asc' }],
  });

  type StdRow = {
    inspect_std_id: number;
    inspect_item_nm: string;
    item_cd: string | null;
    lsl: { toString: () => string } | null;
    usl: { toString: () => string } | null;
    unit: string | null;
  };

  return (stds as StdRow[]).map((s) => ({
    inspect_std_id: s.inspect_std_id,
    inspect_item_nm: s.inspect_item_nm,
    item_cd: s.item_cd,
    lsl: s.lsl != null ? Number(s.lsl) : null,
    usl: s.usl != null ? Number(s.usl) : null,
    unit: s.unit,
  }));
}
