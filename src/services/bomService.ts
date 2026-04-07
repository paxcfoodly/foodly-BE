import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logDataChanges } from './dataHistoryService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
  parseExcelUpload,
  exportToExcel,
} from '../utils';
import type { ColumnMap, ExcelColumn } from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['parent_item_cd', 'child_item_cd', 'use_yn'];

const bomSelect = {
  bom_id: true,
  parent_item_cd: true,
  child_item_cd: true,
  level_no: true,
  qty: true,
  loss_rate: true,
  alt_item_cd: true,
  process_cd: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

const bomWithRelations = {
  ...bomSelect,
  parent_item: { select: { item_nm: true } },
  child_item: { select: { item_nm: true } },
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listBoms(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, boms] = await Promise.all([
    prisma.tbBom.count({ where: where as any }),
    prisma.tbBom.findMany({
      where: where as any,
      select: bomWithRelations,
      orderBy: orderBy.length > 0 ? orderBy : [{ bom_id: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  // Normalize Decimal fields to numbers
  const normalized = boms.map(normalizeBom);

  return buildPaginatedResponse(normalized, total, page, limit);
}

// ─── Get by ID ───

export async function getBomById(bomId: number) {
  const bom = await prisma.tbBom.findUnique({
    where: { bom_id: bomId },
    select: bomWithRelations,
  });
  if (!bom) throw new AppError('존재하지 않는 BOM입니다.', 404);
  return normalizeBom(bom);
}

// ─── Circular reference detection ───

export async function checkCircularReference(parentItemCd: string, childItemCd: string): Promise<void> {
  // Self-reference check
  if (parentItemCd === childItemCd) {
    throw new AppError('모품목과 자품목이 동일합니다. (자기참조)', 409);
  }

  // Reverse-traversal CTE: walk UP from parentItemCd through ancestors.
  // If childItemCd appears as an ancestor of parentItemCd, adding
  // childItemCd → parentItemCd would create a cycle.
  const result: { ancestor_cd: string }[] = await prisma.$queryRawUnsafe(
    `
    WITH RECURSIVE ancestors AS (
      SELECT parent_item_cd AS ancestor_cd, 1 AS depth
      FROM tb_bom
      WHERE child_item_cd = $1 AND use_yn = 'Y'
      UNION ALL
      SELECT b.parent_item_cd, a.depth + 1
      FROM tb_bom b
      INNER JOIN ancestors a ON a.ancestor_cd = b.child_item_cd
      WHERE b.use_yn = 'Y' AND a.depth < 20
    )
    SELECT ancestor_cd FROM ancestors WHERE ancestor_cd = $2 LIMIT 1
    `,
    parentItemCd,
    childItemCd,
  );

  if (result.length > 0) {
    throw new AppError('순환참조가 감지되었습니다. 해당 BOM을 등록할 수 없습니다.', 409);
  }
}

// ─── Duplicate check ───

export async function checkDuplicateBom(
  parentItemCd: string,
  childItemCd: string,
  excludeBomId?: number,
): Promise<void> {
  const where: any = {
    parent_item_cd: parentItemCd,
    child_item_cd: childItemCd,
  };
  if (excludeBomId !== undefined) {
    where.bom_id = { not: excludeBomId };
  }

  const existing = await prisma.tbBom.findFirst({ where });
  if (existing) {
    throw new AppError('동일한 모품목-자품목 조합이 이미 존재합니다.', 409);
  }
}

// ─── Create ───

export interface BomCreateInput {
  parent_item_cd: string;
  child_item_cd: string;
  level_no?: number;
  qty: number;
  loss_rate?: number | null;
  alt_item_cd?: string | null;
  process_cd?: string | null;
  use_yn?: string;
}

export async function createBom(input: BomCreateInput, userId?: string) {
  await checkDuplicateBom(input.parent_item_cd, input.child_item_cd);
  await checkCircularReference(input.parent_item_cd, input.child_item_cd);

  const bom = await prisma.tbBom.create({
    data: {
      parent_item_cd: input.parent_item_cd,
      child_item_cd: input.child_item_cd,
      level_no: input.level_no ?? 1,
      qty: input.qty,
      loss_rate: input.loss_rate ?? null,
      alt_item_cd: input.alt_item_cd ?? null,
      process_cd: input.process_cd ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: bomWithRelations,
  });

  return normalizeBom(bom);
}

// ─── Update (with data history) ───

export interface BomUpdateInput {
  parent_item_cd?: string;
  child_item_cd?: string;
  level_no?: number;
  qty?: number;
  loss_rate?: number | null;
  alt_item_cd?: string | null;
  process_cd?: string | null;
  use_yn?: string;
}

export async function updateBom(bomId: number, input: BomUpdateInput, userId?: string) {
  const existing = await prisma.tbBom.findUnique({
    where: { bom_id: bomId },
    select: bomSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 BOM입니다.', 404);

  const newParent = input.parent_item_cd ?? existing.parent_item_cd;
  const newChild = input.child_item_cd ?? existing.child_item_cd;

  // If parent or child changed, re-validate
  if (newParent !== existing.parent_item_cd || newChild !== existing.child_item_cd) {
    await checkDuplicateBom(newParent, newChild, bomId);
    await checkCircularReference(newParent, newChild);
  }

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.parent_item_cd !== undefined) data.parent_item_cd = input.parent_item_cd;
  if (input.child_item_cd !== undefined) data.child_item_cd = input.child_item_cd;
  if (input.level_no !== undefined) data.level_no = input.level_no;
  if (input.qty !== undefined) data.qty = input.qty;
  if (input.loss_rate !== undefined) data.loss_rate = input.loss_rate;
  if (input.alt_item_cd !== undefined) data.alt_item_cd = input.alt_item_cd;
  if (input.process_cd !== undefined) data.process_cd = input.process_cd;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbBom.update({
    where: { bom_id: bomId },
    data: data as any,
    select: bomSelect,
  });

  // Log data changes (non-blocking)
  const before = normalizeBomRecord(existing);
  const after = normalizeBomRecord(updated);
  logDataChanges('tb_bom', String(bomId), before, after, null, userId);

  return normalizeBom(updated as any);
}

// ─── Delete (with FK protection) ───

export async function deleteBom(bomId: number) {
  const existing = await prisma.tbBom.findUnique({ where: { bom_id: bomId } });
  if (!existing) throw new AppError('존재하지 않는 BOM입니다.', 404);

  try {
    await prisma.tbBom.delete({ where: { bom_id: bomId } });
    return { message: 'BOM이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('다른 데이터에서 참조 중이므로 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Forward Tree Explosion (정전개) ───

export async function getForwardTree(parentItemCd: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH RECURSIVE bom_tree AS (
      SELECT
        b.bom_id,
        b.parent_item_cd,
        b.child_item_cd,
        b.qty,
        b.loss_rate,
        b.level_no,
        b.use_yn,
        1 AS tree_depth,
        i.item_nm AS child_item_nm,
        pi.item_nm AS parent_item_nm
      FROM tb_bom b
      JOIN tb_item i ON i.item_cd = b.child_item_cd
      JOIN tb_item pi ON pi.item_cd = b.parent_item_cd
      WHERE b.parent_item_cd = $1 AND b.use_yn = 'Y'

      UNION ALL

      SELECT
        b.bom_id,
        b.parent_item_cd,
        b.child_item_cd,
        b.qty,
        b.loss_rate,
        b.level_no,
        b.use_yn,
        bt.tree_depth + 1,
        i.item_nm AS child_item_nm,
        pi.item_nm AS parent_item_nm
      FROM tb_bom b
      INNER JOIN bom_tree bt ON bt.child_item_cd = b.parent_item_cd
      JOIN tb_item i ON i.item_cd = b.child_item_cd
      JOIN tb_item pi ON pi.item_cd = b.parent_item_cd
      WHERE b.use_yn = 'Y' AND bt.tree_depth < 20
    )
    SELECT * FROM bom_tree ORDER BY tree_depth, parent_item_cd, child_item_cd
    `,
    parentItemCd,
  );

  return rows.map(normalizeRawRow);
}

// ─── Reverse Tree Explosion (역전개) ───

export async function getReverseTree(childItemCd: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH RECURSIVE bom_tree AS (
      SELECT
        b.bom_id,
        b.parent_item_cd,
        b.child_item_cd,
        b.qty,
        b.loss_rate,
        b.level_no,
        b.use_yn,
        1 AS tree_depth,
        i.item_nm AS child_item_nm,
        pi.item_nm AS parent_item_nm
      FROM tb_bom b
      JOIN tb_item i ON i.item_cd = b.child_item_cd
      JOIN tb_item pi ON pi.item_cd = b.parent_item_cd
      WHERE b.child_item_cd = $1 AND b.use_yn = 'Y'

      UNION ALL

      SELECT
        b.bom_id,
        b.parent_item_cd,
        b.child_item_cd,
        b.qty,
        b.loss_rate,
        b.level_no,
        b.use_yn,
        bt.tree_depth + 1,
        i.item_nm AS child_item_nm,
        pi.item_nm AS parent_item_nm
      FROM tb_bom b
      INNER JOIN bom_tree bt ON bt.parent_item_cd = b.child_item_cd
      JOIN tb_item i ON i.item_cd = b.child_item_cd
      JOIN tb_item pi ON pi.item_cd = b.parent_item_cd
      WHERE b.use_yn = 'Y' AND bt.tree_depth < 20
    )
    SELECT * FROM bom_tree ORDER BY tree_depth, parent_item_cd, child_item_cd
    `,
    childItemCd,
  );

  return rows.map(normalizeRawRow);
}

// ─── Bulk Import (Excel) ───

const IMPORT_COLUMN_MAP: ColumnMap = {
  '모품목코드': { field: 'parent_item_cd', required: true },
  '자품목코드': { field: 'child_item_cd', required: true },
  '레벨':       { field: 'level_no', type: 'number' },
  '소요량':     { field: 'qty', required: true, type: 'number' },
  '손실률':     { field: 'loss_rate', type: 'number' },
  '대체자재':   { field: 'alt_item_cd' },
  '투입공정':   { field: 'process_cd' },
  '사용여부':   { field: 'use_yn' },
};

interface ImportRow {
  parent_item_cd: string;
  child_item_cd: string;
  level_no?: number | null;
  qty: number;
  loss_rate?: number | null;
  alt_item_cd?: string | null;
  process_cd?: string | null;
  use_yn?: string | null;
}

export async function importBoms(buffer: Buffer, userId?: string) {
  const { data, errors } = await parseExcelUpload<ImportRow>(buffer, IMPORT_COLUMN_MAP);

  if (data.length === 0 && errors.length === 0) {
    throw new AppError('엑셀 파일에 데이터가 없습니다.', 400);
  }

  let successCount = 0;
  let errorCount = errors.length;
  const rowErrors = [...errors];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (row.use_yn && !['Y', 'N'].includes(row.use_yn)) {
        rowErrors.push({ row: i + 2, column: 'use_yn', message: '사용여부는 Y 또는 N만 가능합니다.' });
        errorCount++;
        continue;
      }

      if (row.qty <= 0) {
        rowErrors.push({ row: i + 2, column: 'qty', message: '소요량은 0보다 커야 합니다.' });
        errorCount++;
        continue;
      }

      // Check for duplicate and circular reference
      try {
        await checkCircularReference(row.parent_item_cd, row.child_item_cd);
      } catch {
        rowErrors.push({ row: i + 2, column: '-', message: '순환참조가 감지되었습니다.' });
        errorCount++;
        continue;
      }

      // Upsert based on parent+child combination
      const existingBom = await prisma.tbBom.findFirst({
        where: {
          parent_item_cd: row.parent_item_cd,
          child_item_cd: row.child_item_cd,
        },
      });

      if (existingBom) {
        await prisma.tbBom.update({
          where: { bom_id: existingBom.bom_id },
          data: {
            level_no: row.level_no ?? 1,
            qty: row.qty,
            loss_rate: row.loss_rate ?? null,
            alt_item_cd: row.alt_item_cd ?? null,
            process_cd: row.process_cd ?? null,
            use_yn: row.use_yn ?? 'Y',
            update_by: userId ?? null,
            update_dt: new Date(),
          },
        });
      } else {
        await prisma.tbBom.create({
          data: {
            parent_item_cd: row.parent_item_cd,
            child_item_cd: row.child_item_cd,
            level_no: row.level_no ?? 1,
            qty: row.qty,
            loss_rate: row.loss_rate ?? null,
            alt_item_cd: row.alt_item_cd ?? null,
            process_cd: row.process_cd ?? null,
            use_yn: row.use_yn ?? 'Y',
            create_by: userId ?? null,
            update_by: userId ?? null,
          },
        });
      }
      successCount++;
    } catch (err: any) {
      rowErrors.push({ row: i + 2, column: '-', message: err.message ?? '알 수 없는 오류' });
      errorCount++;
    }
  }

  return { totalRows: data.length, successCount, errorCount, errors: rowErrors };
}

// ─── Export (Excel) ───

const EXPORT_COLUMNS: ExcelColumn[] = [
  { header: 'BOM ID',   key: 'bom_id', width: 10 },
  { header: '모품목코드', key: 'parent_item_cd', width: 15 },
  { header: '자품목코드', key: 'child_item_cd', width: 15 },
  { header: '레벨',     key: 'level_no', width: 8 },
  { header: '소요량',   key: 'qty', width: 12 },
  { header: '손실률',   key: 'loss_rate', width: 10 },
  { header: '대체자재', key: 'alt_item_cd', width: 15 },
  { header: '투입공정', key: 'process_cd', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 8 },
  { header: '등록자',   key: 'create_by', width: 12 },
  { header: '등록일시', key: 'create_dt', width: 18 },
  { header: '수정자',   key: 'update_by', width: 12 },
  { header: '수정일시', key: 'update_dt', width: 18 },
];

export async function exportBoms(req: Request, res: Response) {
  const where = parseFilters(req, ALLOWED_FIELDS);

  const boms = await prisma.tbBom.findMany({
    where: where as any,
    select: bomSelect,
    orderBy: { bom_id: 'asc' },
  });

  // Normalize Decimal fields before export
  const normalized = boms.map((b) => {
    const row: Record<string, unknown> = { ...b };
    row.qty = b.qty != null ? Number(b.qty) : null;
    row.loss_rate = b.loss_rate != null ? Number(b.loss_rate) : null;
    return row;
  });

  await exportToExcel(res, EXPORT_COLUMNS, normalized as any[], 'BOM목록');
}

// ─── Helpers ───

function normalizeBom(bom: any) {
  return {
    ...bom,
    qty: bom.qty != null ? Number(bom.qty) : null,
    loss_rate: bom.loss_rate != null ? Number(bom.loss_rate) : null,
  };
}

function normalizeBomRecord(bom: any): Record<string, unknown> {
  return {
    ...bom,
    qty: bom.qty != null ? Number(bom.qty) : null,
    loss_rate: bom.loss_rate != null ? Number(bom.loss_rate) : null,
  };
}

function normalizeRawRow(row: any) {
  return {
    ...row,
    bom_id: typeof row.bom_id === 'bigint' ? Number(row.bom_id) : row.bom_id,
    qty: row.qty != null ? Number(row.qty) : null,
    loss_rate: row.loss_rate != null ? Number(row.loss_rate) : null,
    level_no: typeof row.level_no === 'bigint' ? Number(row.level_no) : row.level_no,
    tree_depth: typeof row.tree_depth === 'bigint' ? Number(row.tree_depth) : row.tree_depth,
  };
}
