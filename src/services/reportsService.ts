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
