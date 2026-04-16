import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export interface OeeResult {
  equip_cd: string;
  equip_nm: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  total_run_min: number;
  total_down_min: number;
  good_qty: number;
  defect_qty: number;
  has_prod_data: boolean;
}

// ─── Validate date range (T-08-05: reject if > 365 days) ───

function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('유효하지 않은 날짜 형식입니다.', 400);
  }
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    throw new AppError('조회 기간은 최대 365일까지 가능합니다.', 400);
  }
}

// ─── Calculate OEE for a single equipment ───

export async function calculateOee(
  equipCd: string,
  startDate: string,
  endDate: string,
): Promise<OeeResult> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get equipment name
  const equip = await prisma.tbEquipment.findUnique({
    where: { equip_cd: equipCd },
    select: { equip_nm: true },
  });
  const equip_nm = equip?.equip_nm ?? equipCd;

  // 1. Availability: query TbEquipStatus for run/total durations
  const statuses = await prisma.tbEquipStatus.findMany({
    where: {
      equip_cd: equipCd,
      start_dt: { gte: start, lte: end },
    },
    select: { status_type: true, duration: true },
  });

  let total_run_min = 0;
  let total_min = 0;
  let total_down_min = 0;

  for (const s of statuses) {
    const dur = s.duration ?? 0;
    total_min += dur;
    if (s.status_type === 'RUN') {
      total_run_min += dur;
    } else {
      total_down_min += dur;
    }
  }

  const availability = total_min > 0 ? Math.min((total_run_min / total_min) * 100, 100) : 0;

  // 2. Performance and Quality: query TbProdResult
  const prodResults = await prisma.tbProdResult.findMany({
    where: {
      equip_cd: equipCd,
      work_start_dt: { gte: start },
      work_end_dt: { lte: end },
    },
    select: {
      good_qty: true,
      defect_qty: true,
      work_start_dt: true,
      work_end_dt: true,
    },
  });

  const has_prod_data = prodResults.length > 0;

  let good_qty = 0;
  let defect_qty = 0;
  let performance = 0;
  let quality = 0;

  if (has_prod_data) {
    for (const r of prodResults) {
      good_qty += Number(r.good_qty);
      defect_qty += Number(r.defect_qty);
    }

    const total_qty = good_qty + defect_qty;
    quality = total_qty > 0 ? (good_qty / total_qty) * 100 : 0;

    // Performance: actual_qty vs theoretical max
    // Group by hour to find max hourly rate
    const hourlyQty: Record<string, number> = {};
    for (const r of prodResults) {
      if (r.work_start_dt && r.work_end_dt) {
        const hours = (r.work_end_dt.getTime() - r.work_start_dt.getTime()) / (1000 * 60 * 60);
        const hourKey = r.work_start_dt.toISOString().substring(0, 13);
        const qty = Number(r.good_qty) + Number(r.defect_qty);
        const rate = hours > 0 ? qty / hours : qty;
        hourlyQty[hourKey] = (hourlyQty[hourKey] ?? 0) + rate;
      }
    }

    const rates = Object.values(hourlyQty);
    const theoretical_max_per_hour = rates.length > 0 ? Math.max(...rates) : 0;
    const total_run_hours = total_run_min / 60;
    const theoretical_capacity = theoretical_max_per_hour * total_run_hours;

    performance =
      theoretical_capacity > 0
        ? Math.min((total_qty / theoretical_capacity) * 100, 100)
        : 0;
  }

  const oee = (availability * performance * quality) / 10000;

  return {
    equip_cd: equipCd,
    equip_nm,
    availability: Math.round(availability * 100) / 100,
    performance: Math.round(performance * 100) / 100,
    quality: Math.round(quality * 100) / 100,
    oee: Math.round(oee * 100) / 100,
    total_run_min,
    total_down_min,
    good_qty,
    defect_qty,
    has_prod_data,
  };
}

// ─── OEE Summary for all active equipment ───

export async function getOeeSummary(startDate: string, endDate: string): Promise<OeeResult[]> {
  validateDateRange(startDate, endDate);

  const equipments = await prisma.tbEquipment.findMany({
    where: { use_yn: 'Y' },
    select: { equip_cd: true },
    orderBy: { equip_cd: 'asc' },
  });

  const results = await Promise.all(
    equipments.map((e) => calculateOee(e.equip_cd, startDate, endDate)),
  );
  return results;
}

// ─── OEE Daily Trend ───

export async function getOeeTrend(
  equipCd: string | null,
  startDate: string,
  endDate: string,
): Promise<Array<{ date: string; availability: number; oee: number }>> {
  validateDateRange(startDate, endDate);

  const start = new Date(startDate);
  const end = new Date(endDate);

  // 날짜 범위 펼치기
  const days: Array<{ dayStr: string; dayStart: Date; dayEnd: Date }> = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dayStr = cursor.toISOString().substring(0, 10);
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    days.push({ dayStr, dayStart, dayEnd });
    cursor.setDate(cursor.getDate() + 1);
  }

  // equipCd 미지정이면 active 설비 목록을 한 번만 조회 (기존엔 매일 반복 조회)
  const equipments = equipCd
    ? null
    : await prisma.tbEquipment.findMany({ where: { use_yn: 'Y' }, select: { equip_cd: true } });

  // 날짜별 OEE 계산을 병렬 실행 (기존엔 날짜 단위 sequential await 로 N일치 누적)
  const results = await Promise.all(
    days.map(async ({ dayStr, dayStart, dayEnd }) => {
      if (equipCd) {
        const oeeData = await calculateOee(equipCd, dayStart.toISOString(), dayEnd.toISOString());
        return { date: dayStr, availability: oeeData.availability, oee: oeeData.oee };
      }
      if (!equipments || equipments.length === 0) {
        return { date: dayStr, availability: 0, oee: 0 };
      }
      const dayResults = await Promise.all(
        equipments.map((e) => calculateOee(e.equip_cd, dayStart.toISOString(), dayEnd.toISOString())),
      );
      const avgAvail = dayResults.reduce((s, r) => s + r.availability, 0) / dayResults.length;
      const avgOee = dayResults.reduce((s, r) => s + r.oee, 0) / dayResults.length;
      return {
        date: dayStr,
        availability: Math.round(avgAvail * 100) / 100,
        oee: Math.round(avgOee * 100) / 100,
      };
    }),
  );

  return results;
}

// ─── Down Reason Summary (Pareto) ───

export async function getDownReasonSummary(
  equipCd: string | null,
  startDate: string,
  endDate: string,
): Promise<Array<{ reason_cd: string; reason_nm: string; total_minutes: number }>> {
  validateDateRange(startDate, endDate);

  const start = new Date(startDate);
  const end = new Date(endDate);

  const where: Record<string, any> = {
    status_type: { not: 'RUN' },
    start_dt: { gte: start, lte: end },
    down_reason_cd: { not: null },
  };
  if (equipCd) where.equip_cd = equipCd;

  const statuses = await prisma.tbEquipStatus.findMany({
    where,
    select: { down_reason_cd: true, duration: true },
  });

  const summaryMap: Record<string, number> = {};
  for (const s of statuses) {
    const cd = s.down_reason_cd ?? 'UNKNOWN';
    summaryMap[cd] = (summaryMap[cd] ?? 0) + (s.duration ?? 0);
  }

  // Fetch common code names for reason codes
  const reasonCodes = Object.keys(summaryMap);
  const commonCodes = await prisma.tbCommonCode.findMany({
    where: { code: { in: reasonCodes } },
    select: { code: true, code_nm: true },
  });
  const codeNameMap: Record<string, string> = {};
  for (const c of commonCodes) {
    codeNameMap[c.code] = c.code_nm;
  }

  return Object.entries(summaryMap)
    .map(([reason_cd, total_minutes]) => ({
      reason_cd,
      reason_nm: codeNameMap[reason_cd] ?? reason_cd,
      total_minutes,
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes);
}
