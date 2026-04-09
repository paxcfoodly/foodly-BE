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
const ALLOWED_FIELDS = ['issue_no', 'status', 'wo_id'];

const materialIssueSelect = {
  issue_id: true,
  issue_no: true,
  wo_id: true,
  status: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  work_order: { select: { wo_no: true } },
  details: {
    select: {
      issue_dtl_id: true,
      item_cd: true,
      lot_no: true,
      request_qty: true,
      issue_qty: true,
      item: { select: { item_nm: true } },
    },
  },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    details: row.details?.map((d: any) => ({
      ...d,
      request_qty: d.request_qty != null ? Number(d.request_qty) : 0,
      issue_qty: d.issue_qty != null ? Number(d.issue_qty) : 0,
    })),
  };
}

// ─── List (paginated + filtered + sorted) ───

export async function listMaterialIssues(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, issues] = await Promise.all([
    prisma.tbMaterialIssue.count({ where: where as any }),
    prisma.tbMaterialIssue.findMany({
      where: where as any,
      select: materialIssueSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ issue_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(issues.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getMaterialIssueById(issueId: number) {
  const issue = await prisma.tbMaterialIssue.findUnique({
    where: { issue_id: issueId },
    select: materialIssueSelect,
  });
  if (!issue) throw new AppError('존재하지 않는 자재불출입니다.', 404);
  return toPlain(issue);
}

// ─── Create ───

export interface MaterialIssueCreateInput {
  wo_id?: number | null;
  details: Array<{
    item_cd: string;
    lot_no?: string | null;
    request_qty: number;
  }>;
}

export async function createMaterialIssue(input: MaterialIssueCreateInput, userId?: string) {
  if (!input.details || input.details.length === 0) {
    throw new AppError('상세 항목은 1건 이상이어야 합니다.', 400);
  }

  // Generate number OUTSIDE transaction (deadlock prevention)
  const issue_no = await generateNumberWithDateReset('ISSUE');

  const issue = await prisma.$transaction(async (tx) => {
    const header = await tx.tbMaterialIssue.create({
      data: {
        issue_no,
        wo_id: input.wo_id ?? null,
        status: 'REQUESTED',
        create_by: userId,
        update_by: userId,
      },
    });

    await tx.tbMaterialIssueDtl.createMany({
      data: input.details.map((d) => ({
        issue_id: header.issue_id,
        item_cd: d.item_cd,
        lot_no: d.lot_no ?? null,
        request_qty: d.request_qty,
        issue_qty: 0,
        create_by: userId,
        update_by: userId,
      })),
    });

    return tx.tbMaterialIssue.findUnique({
      where: { issue_id: header.issue_id },
      select: materialIssueSelect,
    });
  });

  return toPlain(issue);
}

// ─── Update (only REQUESTED status) ───

export interface MaterialIssueUpdateInput {
  wo_id?: number | null;
  details?: Array<{
    item_cd: string;
    lot_no?: string | null;
    request_qty: number;
  }>;
}

export async function updateMaterialIssue(issueId: number, input: MaterialIssueUpdateInput, userId?: string) {
  const existing = await prisma.tbMaterialIssue.findUnique({ where: { issue_id: issueId } });
  if (!existing) throw new AppError('존재하지 않는 자재불출입니다.', 404);
  if (existing.status !== 'REQUESTED') throw new AppError('요청 상태에서만 수정할 수 있습니다.', 400);

  const issue = await prisma.$transaction(async (tx) => {
    await tx.tbMaterialIssue.update({
      where: { issue_id: issueId },
      data: {
        wo_id: input.wo_id !== undefined ? (input.wo_id ?? null) : undefined,
        update_by: userId,
      },
    });

    if (input.details) {
      await tx.tbMaterialIssueDtl.deleteMany({ where: { issue_id: issueId } });
      await tx.tbMaterialIssueDtl.createMany({
        data: input.details.map((d) => ({
          issue_id: issueId,
          item_cd: d.item_cd,
          lot_no: d.lot_no ?? null,
          request_qty: d.request_qty,
          issue_qty: 0,
          create_by: userId,
          update_by: userId,
        })),
      });
    }

    return tx.tbMaterialIssue.findUnique({
      where: { issue_id: issueId },
      select: materialIssueSelect,
    });
  });

  return toPlain(issue);
}

// ─── Delete (only REQUESTED status) ───

export async function deleteMaterialIssue(issueId: number) {
  const existing = await prisma.tbMaterialIssue.findUnique({ where: { issue_id: issueId } });
  if (!existing) throw new AppError('존재하지 않는 자재불출입니다.', 404);
  if (existing.status !== 'REQUESTED') throw new AppError('요청 상태에서만 삭제할 수 있습니다.', 400);

  await prisma.$transaction(async (tx) => {
    await tx.tbMaterialIssueDtl.deleteMany({ where: { issue_id: issueId } });
    await tx.tbMaterialIssue.delete({ where: { issue_id: issueId } });
  });

  return { deleted: true };
}

// ─── Process: REQUESTED → ISSUED ───

export interface ProcessIssueInput {
  wh_cd: string; // source warehouse
  details: Array<{
    issue_dtl_id: number;
    issue_qty: number;
  }>;
}

export async function processMaterialIssue(issueId: number, input: ProcessIssueInput, userId?: string) {
  const whCd = input.wh_cd || 'WH-MAIN';

  const existing = await prisma.tbMaterialIssue.findUnique({
    where: { issue_id: issueId },
    select: { ...materialIssueSelect, status: true },
  });
  if (!existing) throw new AppError('존재하지 않는 자재불출입니다.', 404);
  if (existing.status !== 'REQUESTED') throw new AppError('요청 상태에서만 불출처리할 수 있습니다.', 400);

  const issue = await prisma.$transaction(async (tx) => {
    // Update each detail's issue_qty and deduct inventory
    for (const d of input.details) {
      if (d.issue_qty <= 0) continue;

      // Update detail
      const dtl = await tx.tbMaterialIssueDtl.update({
        where: { issue_dtl_id: d.issue_dtl_id },
        data: { issue_qty: d.issue_qty, update_by: userId },
      });

      // Find inventory for this item+lot+warehouse
      const inv = await tx.tbInventory.findFirst({
        where: {
          item_cd: dtl.item_cd,
          lot_no: dtl.lot_no ?? undefined,
          wh_cd: whCd,
        },
      });

      if (!inv) {
        throw new AppError(`재고가 존재하지 않습니다: ${dtl.item_cd} / ${dtl.lot_no ?? '-'} / ${whCd}`, 400);
      }

      const beforeQty = Number(inv.qty);
      const afterQty = beforeQty - d.issue_qty;
      if (afterQty < 0) {
        throw new AppError(`재고가 부족합니다: ${dtl.item_cd} (현재: ${beforeQty}, 요청: ${d.issue_qty})`, 400);
      }

      // Deduct inventory
      await tx.tbInventory.update({
        where: { inventory_id: inv.inventory_id },
        data: {
          qty: afterQty,
          available_qty: Number(inv.available_qty) - d.issue_qty,
          update_by: userId,
        },
      });

      // Log inventory transaction
      await tx.tbInventoryTx.create({
        data: {
          item_cd: dtl.item_cd,
          lot_no: dtl.lot_no ?? null,
          tx_type: 'OUT',
          tx_qty: d.issue_qty,
          before_qty: beforeQty,
          after_qty: afterQty,
          create_by: userId,
        },
      });
    }

    // Update header status
    await tx.tbMaterialIssue.update({
      where: { issue_id: issueId },
      data: { status: 'ISSUED', update_by: userId },
    });

    return tx.tbMaterialIssue.findUnique({
      where: { issue_id: issueId },
      select: materialIssueSelect,
    });
  });

  return toPlain(issue);
}
