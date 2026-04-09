import prisma from '../config/database';

// ─── Interfaces ───

export interface ProductionDailyPoint {
  date: string;
  good_qty: number;
  defect_qty: number;
  order_qty: number;
  achieve_rate: number;
  defect_rate: number;
}

export interface ProductionSummaryRow {
  group_key: string;
  group_nm: string;
  good_qty: number;
  defect_qty: number;
  order_qty: number;
  achieve_rate: number;
  defect_rate: number;
  work_minutes: number;
  worker_count: number;
}

// ─── Allowed groupBy values ───

const ALLOWED_GROUP_BY = ['item', 'workshop', 'worker'] as const;
type GroupBy = (typeof ALLOWED_GROUP_BY)[number];

function validateGroupBy(groupBy: string): GroupBy {
  if (!ALLOWED_GROUP_BY.includes(groupBy as GroupBy)) {
    return 'item';
  }
  return groupBy as GroupBy;
}

// ─── getProductionDaily ───

export async function getProductionDaily(
  start: string,
  end: string,
  groupBy: string,
  itemCd?: string,
  workshopCd?: string,
  workerId?: string,
): Promise<ProductionDailyPoint[]> {
  // Validate groupBy via allowlist — never interpolated into SQL
  validateGroupBy(groupBy);

  // Build optional filter clauses via template literal parameters (auto-escaped by Prisma)
  type RawRow = {
    date: Date | string;
    good_qty: number;
    defect_qty: number;
    order_qty: number;
  };

  let rows: RawRow[];

  if (itemCd && workshopCd && workerId) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
      INNER JOIN tb_process p ON p.process_cd = wop.process_cd
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND wo.item_cd = ${itemCd}
        AND p.workshop_cd = ${workshopCd}
        AND pr.worker_id = ${workerId}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else if (itemCd && workshopCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
      INNER JOIN tb_process p ON p.process_cd = wop.process_cd
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND wo.item_cd = ${itemCd}
        AND p.workshop_cd = ${workshopCd}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else if (itemCd && workerId) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND wo.item_cd = ${itemCd}
        AND pr.worker_id = ${workerId}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else if (workshopCd && workerId) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
      INNER JOIN tb_process p ON p.process_cd = wop.process_cd
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND p.workshop_cd = ${workshopCd}
        AND pr.worker_id = ${workerId}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else if (itemCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND wo.item_cd = ${itemCd}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else if (workshopCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
      INNER JOIN tb_process p ON p.process_cd = wop.process_cd
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND p.workshop_cd = ${workshopCd}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else if (workerId) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        AND pr.worker_id = ${workerId}
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT DATE(pr.work_start_dt) AS date,
             SUM(pr.good_qty)::FLOAT AS good_qty,
             SUM(pr.defect_qty)::FLOAT AS defect_qty,
             SUM(wo.order_qty)::FLOAT AS order_qty
      FROM tb_prod_result pr
      INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
      WHERE pr.work_start_dt >= ${start}::date
        AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
      GROUP BY DATE(pr.work_start_dt)
      ORDER BY date ASC
    `;
  }

  return rows.map((row) => {
    const good_qty = Number(row.good_qty);
    const defect_qty = Number(row.defect_qty);
    const order_qty = Number(row.order_qty);
    const total_qty = good_qty + defect_qty;
    const achieve_rate = order_qty > 0 ? Math.round((good_qty / order_qty) * 10000) / 100 : 0;
    const defect_rate = total_qty > 0 ? Math.round((defect_qty / total_qty) * 10000) / 100 : 0;
    const dateVal = row.date;
    const dateStr =
      dateVal instanceof Date
        ? dateVal.toISOString().substring(0, 10)
        : String(dateVal).substring(0, 10);
    return { date: dateStr, good_qty, defect_qty, order_qty, achieve_rate, defect_rate };
  });
}

// ─── getProductionSummary ───

export async function getProductionSummary(
  start: string,
  end: string,
  groupBy: string,
  itemCd?: string,
  workshopCd?: string,
  workerId?: string,
): Promise<ProductionSummaryRow[]> {
  // Validate groupBy via allowlist (T-09-01: never interpolated into SQL)
  const validGroupBy = validateGroupBy(groupBy);

  type RawSummaryRow = {
    group_key: string;
    group_nm: string;
    good_qty: number;
    defect_qty: number;
    order_qty: number;
    work_minutes: number;
    worker_count: number | bigint;
  };

  let rows: RawSummaryRow[];

  if (validGroupBy === 'item') {
    if (itemCd) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wo.item_cd AS group_key,
               i.item_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_item i ON i.item_cd = wo.item_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND wo.item_cd = ${itemCd}
        GROUP BY wo.item_cd, i.item_nm
        ORDER BY wo.item_cd ASC
      `;
    } else if (workshopCd) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wo.item_cd AS group_key,
               i.item_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_item i ON i.item_cd = wo.item_cd
        INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
        INNER JOIN tb_process p ON p.process_cd = wop.process_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND p.workshop_cd = ${workshopCd}
        GROUP BY wo.item_cd, i.item_nm
        ORDER BY wo.item_cd ASC
      `;
    } else if (workerId) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wo.item_cd AS group_key,
               i.item_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_item i ON i.item_cd = wo.item_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND pr.worker_id = ${workerId}
        GROUP BY wo.item_cd, i.item_nm
        ORDER BY wo.item_cd ASC
      `;
    } else {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wo.item_cd AS group_key,
               i.item_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_item i ON i.item_cd = wo.item_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        GROUP BY wo.item_cd, i.item_nm
        ORDER BY wo.item_cd ASC
      `;
    }
  } else if (validGroupBy === 'workshop') {
    if (workshopCd) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wp.workshop_cd AS group_key,
               wp.workshop_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
        INNER JOIN tb_process p ON p.process_cd = wop.process_cd
        INNER JOIN tb_workshop wp ON wp.workshop_cd = p.workshop_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND wp.workshop_cd = ${workshopCd}
        GROUP BY wp.workshop_cd, wp.workshop_nm
        ORDER BY wp.workshop_cd ASC
      `;
    } else if (itemCd) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wp.workshop_cd AS group_key,
               wp.workshop_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
        INNER JOIN tb_process p ON p.process_cd = wop.process_cd
        INNER JOIN tb_workshop wp ON wp.workshop_cd = p.workshop_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND wo.item_cd = ${itemCd}
        GROUP BY wp.workshop_cd, wp.workshop_nm
        ORDER BY wp.workshop_cd ASC
      `;
    } else {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT wp.workshop_cd AS group_key,
               wp.workshop_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_wo_process wop ON wop.wo_id = wo.wo_id
        INNER JOIN tb_process p ON p.process_cd = wop.process_cd
        INNER JOIN tb_workshop wp ON wp.workshop_cd = p.workshop_cd
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        GROUP BY wp.workshop_cd, wp.workshop_nm
        ORDER BY wp.workshop_cd ASC
      `;
    }
  } else {
    // groupBy === 'worker'
    if (workerId) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT pr.worker_id AS group_key,
               w.worker_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_worker w ON w.worker_id = pr.worker_id
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND pr.worker_id = ${workerId}
        GROUP BY pr.worker_id, w.worker_nm
        ORDER BY pr.worker_id ASC
      `;
    } else if (itemCd) {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT pr.worker_id AS group_key,
               w.worker_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_worker w ON w.worker_id = pr.worker_id
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
          AND wo.item_cd = ${itemCd}
        GROUP BY pr.worker_id, w.worker_nm
        ORDER BY pr.worker_id ASC
      `;
    } else {
      rows = await prisma.$queryRaw<RawSummaryRow[]>`
        SELECT pr.worker_id AS group_key,
               w.worker_nm AS group_nm,
               SUM(pr.good_qty)::FLOAT AS good_qty,
               SUM(pr.defect_qty)::FLOAT AS defect_qty,
               SUM(wo.order_qty)::FLOAT AS order_qty,
               COALESCE(SUM(EXTRACT(EPOCH FROM (pr.work_end_dt - pr.work_start_dt)) / 60), 0)::FLOAT AS work_minutes,
               COUNT(DISTINCT pr.worker_id)::BIGINT AS worker_count
        FROM tb_prod_result pr
        INNER JOIN tb_work_order wo ON wo.wo_id = pr.wo_id
        INNER JOIN tb_worker w ON w.worker_id = pr.worker_id
        WHERE pr.work_start_dt >= ${start}::date
          AND pr.work_start_dt < ${end}::date + INTERVAL '1 day'
        GROUP BY pr.worker_id, w.worker_nm
        ORDER BY pr.worker_id ASC
      `;
    }
  }

  return rows.map((row) => {
    const good_qty = Number(row.good_qty);
    const defect_qty = Number(row.defect_qty);
    const order_qty = Number(row.order_qty);
    const total_qty = good_qty + defect_qty;
    const achieve_rate = order_qty > 0 ? Math.round((good_qty / order_qty) * 10000) / 100 : 0;
    const defect_rate = total_qty > 0 ? Math.round((defect_qty / total_qty) * 10000) / 100 : 0;
    const work_minutes = Number(row.work_minutes);
    const worker_count = Number(row.worker_count);
    return {
      group_key: String(row.group_key ?? ''),
      group_nm: String(row.group_nm ?? ''),
      good_qty,
      defect_qty,
      order_qty,
      achieve_rate,
      defect_rate,
      work_minutes,
      worker_count,
    };
  });
}

// ─── Interfaces for Quality & Inventory ───

export interface QualityParetoRow {
  defect_type_cd: string;
  defect_type_nm: string;
  total_qty: number;
  cumulative_pct: number;
}

export interface QualityByProcessRow {
  process_cd: string;
  process_nm: string;
  defect_qty: number;
  total_qty: number;
  defect_rate: number;
}

export interface QualityTrendRow {
  date: string;
  defect_qty: number;
  total_qty: number;
  defect_rate: number;
}

export interface QualityDetailRow {
  defect_type_cd: string;
  defect_type_nm: string;
  defect_cause_cd: string;
  defect_cause_nm: string;
  process_cd: string;
  process_nm: string;
  defect_date: string;
  defect_qty: number;
}

export interface InventorySummaryRow {
  item_cd: string;
  item_nm: string;
  wh_cd: string;
  wh_nm: string;
  qty: number;
  unit: string;
  out_qty: number;
  days_since_last_tx: number;
  turnover_rate: number;
  is_stagnant: boolean;
}

// ─── getQualityPareto ───

export async function getQualityPareto(
  start: string,
  end: string,
): Promise<QualityParetoRow[]> {
  type RawRow = {
    defect_type_cd: string | null;
    defect_type_nm: string | null;
    total_qty: number;
  };

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT d.defect_type_cd,
           cc.code_nm AS defect_type_nm,
           SUM(d.defect_qty)::FLOAT AS total_qty
    FROM tb_defect d
    LEFT JOIN tb_common_code cc ON cc.code_type = 'DEFECT_TYPE' AND cc.code = d.defect_type_cd
    WHERE d.create_dt >= ${start}::date
      AND d.create_dt < ${end}::date + INTERVAL '1 day'
    GROUP BY d.defect_type_cd, cc.code_nm
    ORDER BY total_qty DESC
  `;

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.total_qty), 0);
  let cumulative = 0;
  return rows.map((row) => {
    const total_qty = Number(row.total_qty);
    cumulative += total_qty;
    const cumulative_pct =
      grandTotal > 0 ? Math.round((cumulative / grandTotal) * 1000) / 10 : 0;
    return {
      defect_type_cd: row.defect_type_cd ?? '',
      defect_type_nm: row.defect_type_nm ?? row.defect_type_cd ?? '',
      total_qty,
      cumulative_pct,
    };
  });
}

// ─── getQualityByProcess ───

export async function getQualityByProcess(
  start: string,
  end: string,
): Promise<QualityByProcessRow[]> {
  type RawRow = {
    process_cd: string | null;
    process_nm: string | null;
    defect_qty: number;
    total_qty: number;
  };

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT d.process_cd,
           p.process_nm,
           SUM(d.defect_qty)::FLOAT AS defect_qty,
           COALESCE(SUM(pr.good_qty) + SUM(pr.defect_qty), 1)::FLOAT AS total_qty
    FROM tb_defect d
    LEFT JOIN tb_process p ON p.process_cd = d.process_cd
    LEFT JOIN tb_prod_result pr ON pr.wo_id = d.wo_id
    WHERE d.create_dt >= ${start}::date
      AND d.create_dt < ${end}::date + INTERVAL '1 day'
    GROUP BY d.process_cd, p.process_nm
    ORDER BY defect_qty DESC
  `;

  return rows.map((row) => {
    const defect_qty = Number(row.defect_qty);
    const total_qty = Number(row.total_qty);
    const defect_rate =
      total_qty > 0 ? Math.round((defect_qty / total_qty) * 10000) / 100 : 0;
    return {
      process_cd: row.process_cd ?? '',
      process_nm: row.process_nm ?? row.process_cd ?? '',
      defect_qty,
      total_qty,
      defect_rate,
    };
  });
}

// ─── getQualityTrend ───

export async function getQualityTrend(
  start: string,
  end: string,
): Promise<QualityTrendRow[]> {
  type RawRow = {
    date: Date | string;
    defect_qty: number;
    total_qty: number;
  };

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT DATE(d.create_dt) AS date,
           SUM(d.defect_qty)::FLOAT AS defect_qty,
           (SELECT COALESCE(SUM(pr2.good_qty + pr2.defect_qty), 1)::FLOAT
            FROM tb_prod_result pr2
            WHERE DATE(pr2.work_start_dt) = DATE(d.create_dt)) AS total_qty
    FROM tb_defect d
    WHERE d.create_dt >= ${start}::date
      AND d.create_dt < ${end}::date + INTERVAL '1 day'
    GROUP BY DATE(d.create_dt)
    ORDER BY date ASC
  `;

  return rows.map((row) => {
    const defect_qty = Number(row.defect_qty);
    const total_qty = Number(row.total_qty);
    const defect_rate =
      total_qty > 0 ? Math.round((defect_qty / total_qty) * 10000) / 100 : 0;
    const dateVal = row.date;
    const dateStr =
      dateVal instanceof Date
        ? dateVal.toISOString().substring(0, 10)
        : String(dateVal).substring(0, 10);
    return { date: dateStr, defect_qty, total_qty, defect_rate };
  });
}

// ─── getQualityDetail ───

export async function getQualityDetail(
  start: string,
  end: string,
  defectTypeCd?: string,
): Promise<QualityDetailRow[]> {
  type RawRow = {
    defect_type_cd: string | null;
    defect_type_nm: string | null;
    defect_cause_cd: string | null;
    defect_cause_nm: string | null;
    process_cd: string | null;
    process_nm: string | null;
    defect_date: Date | string;
    defect_qty: number;
  };

  let rows: RawRow[];

  if (defectTypeCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT d.defect_type_cd,
             cc1.code_nm AS defect_type_nm,
             d.defect_cause_cd,
             cc2.code_nm AS defect_cause_nm,
             d.process_cd,
             p.process_nm,
             DATE(d.create_dt) AS defect_date,
             d.defect_qty::FLOAT
      FROM tb_defect d
      LEFT JOIN tb_common_code cc1 ON cc1.code_type = 'DEFECT_TYPE' AND cc1.code = d.defect_type_cd
      LEFT JOIN tb_common_code cc2 ON cc2.code_type = 'DEFECT_CAUSE' AND cc2.code = d.defect_cause_cd
      LEFT JOIN tb_process p ON p.process_cd = d.process_cd
      WHERE d.create_dt >= ${start}::date
        AND d.create_dt < ${end}::date + INTERVAL '1 day'
        AND d.defect_type_cd = ${defectTypeCd}
      ORDER BY d.defect_qty DESC
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT d.defect_type_cd,
             cc1.code_nm AS defect_type_nm,
             d.defect_cause_cd,
             cc2.code_nm AS defect_cause_nm,
             d.process_cd,
             p.process_nm,
             DATE(d.create_dt) AS defect_date,
             d.defect_qty::FLOAT
      FROM tb_defect d
      LEFT JOIN tb_common_code cc1 ON cc1.code_type = 'DEFECT_TYPE' AND cc1.code = d.defect_type_cd
      LEFT JOIN tb_common_code cc2 ON cc2.code_type = 'DEFECT_CAUSE' AND cc2.code = d.defect_cause_cd
      LEFT JOIN tb_process p ON p.process_cd = d.process_cd
      WHERE d.create_dt >= ${start}::date
        AND d.create_dt < ${end}::date + INTERVAL '1 day'
      ORDER BY d.defect_qty DESC
    `;
  }

  return rows.map((row) => {
    const dateVal = row.defect_date;
    const dateStr =
      dateVal instanceof Date
        ? dateVal.toISOString().substring(0, 10)
        : String(dateVal).substring(0, 10);
    return {
      defect_type_cd: row.defect_type_cd ?? '',
      defect_type_nm: row.defect_type_nm ?? row.defect_type_cd ?? '',
      defect_cause_cd: row.defect_cause_cd ?? '',
      defect_cause_nm: row.defect_cause_nm ?? row.defect_cause_cd ?? '',
      process_cd: row.process_cd ?? '',
      process_nm: row.process_nm ?? row.process_cd ?? '',
      defect_date: dateStr,
      defect_qty: Number(row.defect_qty),
    };
  });
}

// ─── getInventorySummary ───

export async function getInventorySummary(
  whCd?: string,
  itemCd?: string,
): Promise<InventorySummaryRow[]> {
  type RawRow = {
    item_cd: string;
    item_nm: string;
    wh_cd: string;
    wh_nm: string;
    qty: number;
    unit: string | null;
    out_qty: number;
    days_since_last_tx: number | bigint | null;
  };

  let rows: RawRow[];

  if (whCd && itemCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT inv.item_cd,
             it.item_nm,
             inv.wh_cd,
             wh.wh_nm,
             inv.qty::FLOAT AS qty,
             it.unit,
             COALESCE(out_sum.out_qty, 0)::FLOAT AS out_qty,
             COALESCE(
               CURRENT_DATE - MAX(tx_all.create_dt)::date,
               999
             ) AS days_since_last_tx
      FROM tb_inventory inv
      INNER JOIN tb_item it ON it.item_cd = inv.item_cd
      INNER JOIN tb_warehouse wh ON wh.wh_cd = inv.wh_cd
      LEFT JOIN (
        SELECT tx.item_cd, SUM(tx.tx_qty)::FLOAT AS out_qty
        FROM tb_inventory_tx tx
        WHERE tx.tx_type = 'OUT'
          AND tx.create_dt >= (CURRENT_DATE - INTERVAL '90 day')
        GROUP BY tx.item_cd
      ) out_sum ON out_sum.item_cd = inv.item_cd
      LEFT JOIN tb_inventory_tx tx_all ON tx_all.item_cd = inv.item_cd
      WHERE inv.qty > 0
        AND inv.wh_cd = ${whCd}
        AND inv.item_cd = ${itemCd}
      GROUP BY inv.item_cd, it.item_nm, inv.wh_cd, wh.wh_nm, inv.qty, it.unit, out_sum.out_qty
      ORDER BY days_since_last_tx DESC
    `;
  } else if (whCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT inv.item_cd,
             it.item_nm,
             inv.wh_cd,
             wh.wh_nm,
             inv.qty::FLOAT AS qty,
             it.unit,
             COALESCE(out_sum.out_qty, 0)::FLOAT AS out_qty,
             COALESCE(
               CURRENT_DATE - MAX(tx_all.create_dt)::date,
               999
             ) AS days_since_last_tx
      FROM tb_inventory inv
      INNER JOIN tb_item it ON it.item_cd = inv.item_cd
      INNER JOIN tb_warehouse wh ON wh.wh_cd = inv.wh_cd
      LEFT JOIN (
        SELECT tx.item_cd, SUM(tx.tx_qty)::FLOAT AS out_qty
        FROM tb_inventory_tx tx
        WHERE tx.tx_type = 'OUT'
          AND tx.create_dt >= (CURRENT_DATE - INTERVAL '90 day')
        GROUP BY tx.item_cd
      ) out_sum ON out_sum.item_cd = inv.item_cd
      LEFT JOIN tb_inventory_tx tx_all ON tx_all.item_cd = inv.item_cd
      WHERE inv.qty > 0
        AND inv.wh_cd = ${whCd}
      GROUP BY inv.item_cd, it.item_nm, inv.wh_cd, wh.wh_nm, inv.qty, it.unit, out_sum.out_qty
      ORDER BY days_since_last_tx DESC
    `;
  } else if (itemCd) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT inv.item_cd,
             it.item_nm,
             inv.wh_cd,
             wh.wh_nm,
             inv.qty::FLOAT AS qty,
             it.unit,
             COALESCE(out_sum.out_qty, 0)::FLOAT AS out_qty,
             COALESCE(
               CURRENT_DATE - MAX(tx_all.create_dt)::date,
               999
             ) AS days_since_last_tx
      FROM tb_inventory inv
      INNER JOIN tb_item it ON it.item_cd = inv.item_cd
      INNER JOIN tb_warehouse wh ON wh.wh_cd = inv.wh_cd
      LEFT JOIN (
        SELECT tx.item_cd, SUM(tx.tx_qty)::FLOAT AS out_qty
        FROM tb_inventory_tx tx
        WHERE tx.tx_type = 'OUT'
          AND tx.create_dt >= (CURRENT_DATE - INTERVAL '90 day')
        GROUP BY tx.item_cd
      ) out_sum ON out_sum.item_cd = inv.item_cd
      LEFT JOIN tb_inventory_tx tx_all ON tx_all.item_cd = inv.item_cd
      WHERE inv.qty > 0
        AND inv.item_cd = ${itemCd}
      GROUP BY inv.item_cd, it.item_nm, inv.wh_cd, wh.wh_nm, inv.qty, it.unit, out_sum.out_qty
      ORDER BY days_since_last_tx DESC
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT inv.item_cd,
             it.item_nm,
             inv.wh_cd,
             wh.wh_nm,
             inv.qty::FLOAT AS qty,
             it.unit,
             COALESCE(out_sum.out_qty, 0)::FLOAT AS out_qty,
             COALESCE(
               CURRENT_DATE - MAX(tx_all.create_dt)::date,
               999
             ) AS days_since_last_tx
      FROM tb_inventory inv
      INNER JOIN tb_item it ON it.item_cd = inv.item_cd
      INNER JOIN tb_warehouse wh ON wh.wh_cd = inv.wh_cd
      LEFT JOIN (
        SELECT tx.item_cd, SUM(tx.tx_qty)::FLOAT AS out_qty
        FROM tb_inventory_tx tx
        WHERE tx.tx_type = 'OUT'
          AND tx.create_dt >= (CURRENT_DATE - INTERVAL '90 day')
        GROUP BY tx.item_cd
      ) out_sum ON out_sum.item_cd = inv.item_cd
      LEFT JOIN tb_inventory_tx tx_all ON tx_all.item_cd = inv.item_cd
      WHERE inv.qty > 0
      GROUP BY inv.item_cd, it.item_nm, inv.wh_cd, wh.wh_nm, inv.qty, it.unit, out_sum.out_qty
      ORDER BY days_since_last_tx DESC
    `;
  }

  return rows.map((row) => {
    const qty = Number(row.qty);
    const out_qty = Number(row.out_qty);
    const days_since_last_tx = Number(row.days_since_last_tx ?? 999);
    const turnover_rate = Math.round((out_qty / (qty || 1)) * 1000) / 1000;
    const is_stagnant = days_since_last_tx >= 90;
    return {
      item_cd: row.item_cd,
      item_nm: row.item_nm,
      wh_cd: row.wh_cd,
      wh_nm: row.wh_nm,
      qty,
      unit: row.unit ?? '',
      out_qty,
      days_since_last_tx,
      turnover_rate,
      is_stagnant,
    };
  });
}
