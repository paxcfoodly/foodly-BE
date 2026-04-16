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
const ALLOWED_FIELDS = ['lot_no', 'item_cd', 'lot_status', 'create_type', 'wo_id', 'wh_cd', 'parent_lot_no'];

const lotSelect = {
  lot_no: true,
  item_cd: true,
  lot_qty: true,
  lot_status: true,
  create_type: true,
  parent_lot_no: true,
  wo_id: true,
  wh_cd: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true, item_type: true, unit_cd: true } },
  work_order: { select: { wo_no: true } },
  warehouse: { select: { wh_nm: true } },
  parent_lot: { select: { lot_no: true, item_cd: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    lot_qty: row.lot_qty != null ? Number(row.lot_qty) : 0,
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listLots(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, lots] = await Promise.all([
    prisma.tbLot.count({ where: where as any }),
    prisma.tbLot.findMany({
      where: where as any,
      select: lotSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ create_dt: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(lots.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getLotById(lotNo: string) {
  const lot = await prisma.tbLot.findUnique({
    where: { lot_no: lotNo },
    select: {
      ...lotSelect,
      child_lots: { select: { lot_no: true, item_cd: true, lot_qty: true, lot_status: true, create_type: true } },
      lot_histories: {
        select: { lot_hist_id: true, event_type: true, event_detail: true, qty: true, create_by: true, create_dt: true },
        orderBy: { create_dt: 'desc' },
      },
    },
  });
  if (!lot) throw new AppError('존재하지 않는 LOT입니다.', 404);

  return {
    ...toPlain(lot),
    child_lots: (lot as any).child_lots?.map((c: any) => ({ ...c, lot_qty: c.lot_qty != null ? Number(c.lot_qty) : 0 })) ?? [],
    lot_histories: (lot as any).lot_histories?.map((h: any) => ({ ...h, qty: h.qty != null ? Number(h.qty) : null })) ?? [],
  };
}

// ─── Forward Trace (recursive CTE) ───
// lot → child_lots via parent_lot_no chain + material_input join → downstream prod_results → their lots

export async function forwardTrace(lotNo: string) {
  // Verify lot exists
  const lot = await prisma.tbLot.findUnique({ where: { lot_no: lotNo }, select: { lot_no: true } });
  if (!lot) throw new AppError('존재하지 않는 LOT입니다.', 404);

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH RECURSIVE forward_tree AS (
      -- Base: the starting lot
      SELECT
        l.lot_no,
        l.item_cd,
        l.lot_qty,
        l.lot_status,
        l.create_type,
        l.parent_lot_no,
        l.wo_id,
        1 AS depth,
        'CHILD_LOT' AS link_type
      FROM tb_lot l
      WHERE l.parent_lot_no = $1

      UNION ALL

      -- Recursive: follow child lots
      SELECT
        l.lot_no,
        l.item_cd,
        l.lot_qty,
        l.lot_status,
        l.create_type,
        l.parent_lot_no,
        l.wo_id,
        ft.depth + 1,
        'CHILD_LOT' AS link_type
      FROM tb_lot l
      INNER JOIN forward_tree ft ON ft.lot_no = l.parent_lot_no
      WHERE ft.depth < 20
    )
    SELECT * FROM forward_tree ORDER BY depth, lot_no
    `,
    lotNo,
  );

  // Also find downstream lots through material_input → prod_result linkage
  const crossWoRows: any[] = await prisma.$queryRawUnsafe(
    `
    SELECT DISTINCT
      pr.lot_no AS downstream_lot_no,
      pr.wo_id AS downstream_wo_id,
      mi.wo_id AS source_wo_id,
      mi.lot_no AS source_lot_no,
      l.item_cd,
      l.lot_qty,
      l.lot_status,
      l.create_type
    FROM tb_material_input mi
    JOIN tb_prod_result pr ON pr.wo_id = mi.wo_id
    JOIN tb_lot l ON l.lot_no = pr.lot_no
    WHERE mi.lot_no = $1
      AND pr.lot_no IS NOT NULL
      AND pr.lot_no != $1
    `,
    lotNo,
  );

  return {
    origin: lotNo,
    child_lots: rows.map((r: any) => ({
      ...r,
      lot_qty: r.lot_qty != null ? Number(r.lot_qty) : 0,
    })),
    downstream_lots: crossWoRows.map((r: any) => ({
      ...r,
      lot_qty: r.lot_qty != null ? Number(r.lot_qty) : 0,
    })),
  };
}

// ─── Backward Trace (recursive CTE) ───
// lot → parent_lot_no chain upward

export async function backwardTrace(lotNo: string) {
  const lot = await prisma.tbLot.findUnique({ where: { lot_no: lotNo }, select: { lot_no: true } });
  if (!lot) throw new AppError('존재하지 않는 LOT입니다.', 404);

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH RECURSIVE backward_tree AS (
      -- Base: the starting lot's parent
      SELECT
        l.lot_no,
        l.item_cd,
        l.lot_qty,
        l.lot_status,
        l.create_type,
        l.parent_lot_no,
        l.wo_id,
        1 AS depth
      FROM tb_lot l
      WHERE l.lot_no = (SELECT parent_lot_no FROM tb_lot WHERE lot_no = $1)

      UNION ALL

      -- Recursive: follow parent chain
      SELECT
        l.lot_no,
        l.item_cd,
        l.lot_qty,
        l.lot_status,
        l.create_type,
        l.parent_lot_no,
        l.wo_id,
        bt.depth + 1
      FROM tb_lot l
      INNER JOIN backward_tree bt ON bt.lot_no = l.parent_lot_no
      WHERE bt.depth < 20
    )
    SELECT * FROM backward_tree ORDER BY depth, lot_no
    `,
    lotNo,
  );

  // Also find upstream lots through prod_result → material_input linkage
  const crossWoRows: any[] = await prisma.$queryRawUnsafe(
    `
    SELECT DISTINCT
      mi.lot_no AS upstream_lot_no,
      mi.wo_id AS source_wo_id,
      pr.wo_id AS current_wo_id,
      l.item_cd,
      l.lot_qty,
      l.lot_status,
      l.create_type
    FROM tb_prod_result pr
    JOIN tb_material_input mi ON mi.wo_id = pr.wo_id
    JOIN tb_lot l ON l.lot_no = mi.lot_no
    WHERE pr.lot_no = $1
      AND mi.lot_no IS NOT NULL
      AND mi.lot_no != $1
    `,
    lotNo,
  );

  return {
    origin: lotNo,
    parent_lots: rows.map((r: any) => ({
      ...r,
      lot_qty: r.lot_qty != null ? Number(r.lot_qty) : 0,
    })),
    upstream_lots: crossWoRows.map((r: any) => ({
      ...r,
      lot_qty: r.lot_qty != null ? Number(r.lot_qty) : 0,
    })),
  };
}

// ─── Split LOT ───
// Create N child lots from parent, deduct parent qty, set SPLIT status, log history

export interface LotSplitInput {
  children: { qty: number }[];
}

export async function splitLot(lotNo: string, input: LotSplitInput, loginId?: string) {
  // Validate parent exists and is ACTIVE
  const parent = await prisma.tbLot.findUnique({
    where: { lot_no: lotNo },
    select: { lot_no: true, lot_qty: true, lot_status: true, item_cd: true, wo_id: true, wh_cd: true },
  });
  if (!parent) throw new AppError('존재하지 않는 LOT입니다.', 404);
  if (parent.lot_status !== 'ACTIVE') throw new AppError('ACTIVE 상태의 LOT만 분할할 수 있습니다.', 400);

  if (!input.children || input.children.length < 2) {
    throw new AppError('분할 시 최소 2개 이상의 자식 LOT이 필요합니다.', 400);
  }

  const parentQty = Number(parent.lot_qty);
  const childSum = input.children.reduce((sum, c) => sum + c.qty, 0);

  // Allow small floating point tolerance
  if (Math.abs(childSum - parentQty) > 0.001) {
    throw new AppError(`자식 LOT 수량 합계(${childSum})가 부모 LOT 수량(${parentQty})과 일치하지 않습니다.`, 400);
  }

  // Generate LOT numbers OUTSIDE $transaction (established pattern)
  const childLotNos: string[] = [];
  for (let i = 0; i < input.children.length; i++) {
    childLotNos.push(await generateNumberWithDateReset('LOT'));
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update parent: set qty to 0, status to SPLIT
    await tx.tbLot.update({
      where: { lot_no: lotNo },
      data: {
        lot_qty: 0,
        lot_status: 'SPLIT',
        update_by: loginId ?? null,
        update_dt: new Date(),
      },
    });

    // Log parent split event
    await tx.tbLotHistory.create({
      data: {
        lot_no: lotNo,
        event_type: 'SPLIT',
        event_detail: `${input.children.length}개 LOT으로 분할: ${childLotNos.join(', ')}`,
        qty: parentQty,
        create_by: loginId ?? null,
      },
    });

    // Create child lots
    const childLots = [];
    for (let i = 0; i < input.children.length; i++) {
      const child = await tx.tbLot.create({
        data: {
          lot_no: childLotNos[i],
          item_cd: parent.item_cd,
          lot_qty: input.children[i].qty,
          lot_status: 'ACTIVE',
          create_type: 'SPLIT',
          parent_lot_no: lotNo,
          wo_id: parent.wo_id,
          wh_cd: parent.wh_cd,
          create_by: loginId ?? null,
          update_by: loginId ?? null,
        },
      });
      childLots.push(child);

      // Log child creation
      await tx.tbLotHistory.create({
        data: {
          lot_no: childLotNos[i],
          event_type: 'CREATE',
          event_detail: `분할 생성 (원본: ${lotNo})`,
          qty: input.children[i].qty,
          create_by: loginId ?? null,
        },
      });
    }

    return childLots;
  });

  return {
    parent_lot_no: lotNo,
    children: result.map((c: any) => ({
      lot_no: c.lot_no,
      item_cd: c.item_cd,
      lot_qty: Number(c.lot_qty),
      lot_status: c.lot_status,
      create_type: c.create_type,
    })),
  };
}

// ─── Merge LOTs ───
// Create 1 child from N parents, zero parent qtys, set MERGED status, log history

export interface LotMergeInput {
  source_lot_nos: string[];
}

export async function mergeLots(input: LotMergeInput, loginId?: string) {
  if (!input.source_lot_nos || input.source_lot_nos.length < 2) {
    throw new AppError('병합 시 최소 2개 이상의 원본 LOT이 필요합니다.', 400);
  }

  // Validate all source lots exist, are ACTIVE, and share the same item_cd
  const sources = await prisma.tbLot.findMany({
    where: { lot_no: { in: input.source_lot_nos } },
    select: { lot_no: true, lot_qty: true, lot_status: true, item_cd: true, wo_id: true, wh_cd: true },
  });

  if (sources.length !== input.source_lot_nos.length) {
    const found = sources.map((s) => s.lot_no);
    const missing = input.source_lot_nos.filter((n) => !found.includes(n));
    throw new AppError(`존재하지 않는 LOT: ${missing.join(', ')}`, 404);
  }

  const nonActive = sources.filter((s) => s.lot_status !== 'ACTIVE');
  if (nonActive.length > 0) {
    throw new AppError(`ACTIVE 상태가 아닌 LOT: ${nonActive.map((s) => s.lot_no).join(', ')}`, 400);
  }

  const itemCds = [...new Set(sources.map((s) => s.item_cd))];
  if (itemCds.length > 1) {
    throw new AppError('동일한 품목의 LOT만 병합할 수 있습니다.', 400);
  }

  const mergedQty = sources.reduce((sum, s) => sum + Number(s.lot_qty), 0);

  // Generate merged LOT number OUTSIDE $transaction
  const mergedLotNo = await generateNumberWithDateReset('LOT');

  const result = await prisma.$transaction(async (tx) => {
    // Zero out source lots and set MERGED status
    for (const src of sources) {
      await tx.tbLot.update({
        where: { lot_no: src.lot_no },
        data: {
          lot_qty: 0,
          lot_status: 'MERGED',
          update_by: loginId ?? null,
          update_dt: new Date(),
        },
      });

      await tx.tbLotHistory.create({
        data: {
          lot_no: src.lot_no,
          event_type: 'MERGE',
          event_detail: `병합됨 → ${mergedLotNo}`,
          qty: Number(src.lot_qty),
          create_by: loginId ?? null,
        },
      });
    }

    // Create merged lot (use first source's wo_id and wh_cd)
    const merged = await tx.tbLot.create({
      data: {
        lot_no: mergedLotNo,
        item_cd: itemCds[0],
        lot_qty: mergedQty,
        lot_status: 'ACTIVE',
        create_type: 'MERGE',
        parent_lot_no: sources[0].lot_no, // reference first source as parent
        wo_id: sources[0].wo_id,
        wh_cd: sources[0].wh_cd,
        create_by: loginId ?? null,
        update_by: loginId ?? null,
      },
    });

    // Log merged lot creation
    await tx.tbLotHistory.create({
      data: {
        lot_no: mergedLotNo,
        event_type: 'CREATE',
        event_detail: `병합 생성 (원본: ${input.source_lot_nos.join(', ')})`,
        qty: mergedQty,
        create_by: loginId ?? null,
      },
    });

    return merged;
  });

  return {
    merged_lot: {
      lot_no: result.lot_no,
      item_cd: result.item_cd,
      lot_qty: Number(result.lot_qty),
      lot_status: result.lot_status,
      create_type: result.create_type,
    },
    source_lot_nos: input.source_lot_nos,
  };
}

// ─── Update Status ───

export async function updateLotStatus(lotNo: string, status: string, loginId?: string) {
  const lot = await prisma.tbLot.findUnique({
    where: { lot_no: lotNo },
    select: { lot_no: true, lot_status: true },
  });
  if (!lot) throw new AppError('존재하지 않는 LOT입니다.', 404);

  const validStatuses = ['ACTIVE', 'HOLD', 'CONSUMED', 'DISPOSED'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`유효하지 않은 상태입니다. (${validStatuses.join(', ')})`, 400);
  }

  // Don't allow changing status of already SPLIT/MERGED lots
  if (lot.lot_status === 'SPLIT' || lot.lot_status === 'MERGED') {
    throw new AppError(`${lot.lot_status} 상태의 LOT은 상태를 변경할 수 없습니다.`, 400);
  }

  const updated = await prisma.tbLot.update({
    where: { lot_no: lotNo },
    data: {
      lot_status: status,
      update_by: loginId ?? null,
      update_dt: new Date(),
    },
    select: lotSelect,
  });

  // Log status change
  await prisma.tbLotHistory.create({
    data: {
      lot_no: lotNo,
      event_type: 'ADJUST',
      event_detail: `상태 변경: ${lot.lot_status} → ${status}`,
      create_by: loginId ?? null,
    },
  });

  return toPlain(updated);
}
