import { Request } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logDataChanges } from './dataHistoryService';
import { generateNumberWithDateReset } from './numberingService';
import { listRoutingsByItem } from './routingService';
import { getForwardTree } from './bomService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
} from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['wo_no', 'item_cd', 'status', 'priority', 'plan_id'];

const workOrderSelect = {
  wo_id: true,
  wo_no: true,
  plan_id: true,
  item_cd: true,
  order_qty: true,
  good_qty: true,
  defect_qty: true,
  priority: true,
  status: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  item: { select: { item_nm: true } },
  prod_plan: { select: { plan_no: true } },
} as const;

/** Decimal → Number conversion for JSON-safe response */
function toPlain(row: any) {
  return {
    ...row,
    order_qty: row.order_qty != null ? Number(row.order_qty) : null,
    good_qty: row.good_qty != null ? Number(row.good_qty) : null,
    defect_qty: row.defect_qty != null ? Number(row.defect_qty) : null,
  };
}

// ─── Status transition map ───
const STATUS_TRANSITIONS: Record<string, string[]> = {
  WAIT: ['PROGRESS', 'CANCEL'],
  PROGRESS: ['COMPLETE', 'CANCEL'],
  COMPLETE: ['CLOSE'],
  CLOSE: [],
  CANCEL: [],
};

// Statuses that block edit/delete
const IMMUTABLE_STATUSES = ['COMPLETE', 'CLOSE', 'CANCEL'];

// ─── List (paginated + filtered + sorted) ───

export async function listWorkOrders(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, orders] = await Promise.all([
    prisma.tbWorkOrder.count({ where: where as any }),
    prisma.tbWorkOrder.findMany({
      where: where as any,
      select: workOrderSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ wo_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(orders.map(toPlain), total, page, limit);
}

// ─── Get by ID ───

export async function getWorkOrderById(woId: number) {
  const order = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: woId },
    select: {
      ...workOrderSelect,
      wo_processes: {
        select: {
          wo_process_id: true,
          process_cd: true,
          seq_no: true,
          equip_cd: true,
          status: true,
          process: { select: { process_nm: true } },
        },
        orderBy: { seq_no: 'asc' },
      },
    },
  });
  if (!order) throw new AppError('존재하지 않는 작업지시입니다.', 404);
  return toPlain(order);
}

// ─── Create ───

export interface WorkOrderCreateInput {
  plan_id?: number | null;
  item_cd: string;
  order_qty: number;
  priority?: number;
}

export async function createWorkOrder(input: WorkOrderCreateInput, userId?: string) {
  // Validate order_qty
  if (input.order_qty == null || input.order_qty < 0) {
    throw new AppError('지시수량은 0 이상이어야 합니다.', 400);
  }

  // Validate FK: item
  const item = await prisma.tbItem.findUnique({ where: { item_cd: input.item_cd } });
  if (!item) throw new AppError('존재하지 않는 품목코드입니다.', 400);

  // Validate FK: plan_id (optional)
  if (input.plan_id != null) {
    const plan = await prisma.tbProdPlan.findUnique({ where: { plan_id: input.plan_id } });
    if (!plan) throw new AppError('존재하지 않는 생산계획입니다.', 400);
  }

  // Auto-generate wo_no
  const wo_no = await generateNumberWithDateReset('WORK_ORDER');

  // Get routings for automatic wo_process creation
  const routings = await listRoutingsByItem(input.item_cd);

  const order = await prisma.$transaction(async (tx) => {
    // Create work order
    const wo = await tx.tbWorkOrder.create({
      data: {
        wo_no,
        plan_id: input.plan_id ?? null,
        item_cd: input.item_cd,
        order_qty: input.order_qty,
        priority: input.priority ?? 5,
        status: 'WAIT',
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
      select: workOrderSelect,
    });

    // Auto-create wo_processes from routings
    if (routings.length > 0) {
      await tx.tbWoProcess.createMany({
        data: routings.map((r) => ({
          wo_id: wo.wo_id,
          process_cd: r.process_cd,
          seq_no: r.seq_no,
          status: 'WAIT',
          create_by: userId ?? null,
          update_by: userId ?? null,
        })),
      });
    }

    return wo;
  });

  return toPlain(order);
}

// ─── Update ───

export interface WorkOrderUpdateInput {
  plan_id?: number | null;
  item_cd?: string;
  order_qty?: number;
  priority?: number;
}

export async function updateWorkOrder(woId: number, input: WorkOrderUpdateInput, userId?: string) {
  const existing = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: woId },
    select: workOrderSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Block edit unless WAIT
  if (existing.status !== 'WAIT') {
    throw new AppError('대기(WAIT) 상태에서만 작업지시를 수정할 수 있습니다.', 409);
  }

  // Validate order_qty if provided
  if (input.order_qty != null && input.order_qty < 0) {
    throw new AppError('지시수량은 0 이상이어야 합니다.', 400);
  }

  // Build update data — only provided fields
  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.plan_id !== undefined) data.plan_id = input.plan_id;
  if (input.item_cd !== undefined) data.item_cd = input.item_cd;
  if (input.order_qty !== undefined) data.order_qty = input.order_qty;
  if (input.priority !== undefined) data.priority = input.priority;

  const updated = await prisma.tbWorkOrder.update({
    where: { wo_id: woId },
    data: data as any,
    select: workOrderSelect,
  });

  // Log data changes (non-blocking)
  logDataChanges(
    'tb_work_order',
    String(woId),
    toPlain(existing),
    toPlain(updated),
    null,
    userId,
  );

  return toPlain(updated);
}

// ─── Delete ───

export async function deleteWorkOrder(woId: number) {
  const existing = await prisma.tbWorkOrder.findUnique({ where: { wo_id: woId } });
  if (!existing) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Block delete unless WAIT
  if (existing.status !== 'WAIT') {
    throw new AppError('대기(WAIT) 상태에서만 작업지시를 삭제할 수 있습니다.', 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete child wo_processes first
      await tx.tbWoProcess.deleteMany({ where: { wo_id: woId } });
      await tx.tbWorkOrder.delete({ where: { wo_id: woId } });
    });
    return { message: '작업지시가 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('실적 등 다른 데이터에서 참조 중이므로 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}

// ─── Split Work Order ───

export async function splitWorkOrder(woId: number, splitQty: number, userId?: string) {
  // Validate splitQty > 0
  if (splitQty == null || splitQty <= 0) {
    throw new AppError('분할수량은 0보다 커야 합니다.', 400);
  }

  const existing = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: woId },
    select: {
      ...workOrderSelect,
      wo_processes: {
        select: {
          process_cd: true,
          seq_no: true,
          equip_cd: true,
          status: true,
        },
        orderBy: { seq_no: 'asc' },
      },
    },
  });
  if (!existing) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Only WAIT status can be split
  if (existing.status !== 'WAIT') {
    throw new AppError('대기(WAIT) 상태에서만 작업지시를 분할할 수 있습니다.', 409);
  }

  const originalQty = Number(existing.order_qty);

  // splitQty must be less than original qty (both sides must have > 0)
  if (splitQty >= originalQty) {
    throw new AppError('분할수량은 원본 지시수량보다 작아야 합니다.', 400);
  }

  const remainingQty = originalQty - splitQty;

  // Generate new wo_no for the split order
  const newWoNo = await generateNumberWithDateReset('WORK_ORDER');

  const result = await prisma.$transaction(async (tx) => {
    // (a) Reduce original order_qty
    const updatedOriginal = await tx.tbWorkOrder.update({
      where: { wo_id: woId },
      data: {
        order_qty: remainingQty,
        update_by: userId ?? null,
        update_dt: new Date(),
      },
      select: workOrderSelect,
    });

    // (b) Create new WO with splitQty
    const newOrder = await tx.tbWorkOrder.create({
      data: {
        wo_no: newWoNo,
        plan_id: existing.plan_id,
        item_cd: existing.item_cd,
        order_qty: splitQty,
        priority: existing.priority,
        status: 'WAIT',
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
      select: workOrderSelect,
    });

    // (c) Replicate wo_processes from original to new WO
    if (existing.wo_processes.length > 0) {
      await tx.tbWoProcess.createMany({
        data: existing.wo_processes.map((p) => ({
          wo_id: newOrder.wo_id,
          process_cd: p.process_cd,
          seq_no: p.seq_no,
          equip_cd: p.equip_cd,
          status: 'WAIT',
          create_by: userId ?? null,
          update_by: userId ?? null,
        })),
      });
    }

    return { original: updatedOriginal, split: newOrder };
  });

  return {
    original: toPlain(result.original),
    split: toPlain(result.split),
  };
}

// ─── Change Status ───

export async function changeStatus(woId: number, newStatus: string, userId?: string) {
  const existing = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: woId },
    select: workOrderSelect,
  });
  if (!existing) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  const currentStatus = existing.status;
  const allowed = STATUS_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `상태를 ${currentStatus}에서 ${newStatus}(으)로 변경할 수 없습니다.`,
      409,
    );
  }

  const updated = await prisma.tbWorkOrder.update({
    where: { wo_id: woId },
    data: {
      status: newStatus,
      update_by: userId ?? null,
      update_dt: new Date(),
    },
    select: workOrderSelect,
  });

  // Log data changes
  logDataChanges(
    'tb_work_order',
    String(woId),
    toPlain(existing),
    toPlain(updated),
    null,
    userId,
  );

  return toPlain(updated);
}

// ─── Generate PDF ───

const STATUS_LABEL_EN: Record<string, string> = {
  WAIT: 'Wait',
  PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  CLOSE: 'Closed',
  CANCEL: 'Cancelled',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: '1 (Highest)',
  2: '2',
  3: '3',
  4: '4',
  5: '5 (Normal)',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10 (Lowest)',
};

export async function generatePdf(woId: number): Promise<PDFKit.PDFDocument> {
  // Fetch work order with processes
  const order = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: woId },
    select: {
      wo_id: true,
      wo_no: true,
      plan_id: true,
      item_cd: true,
      order_qty: true,
      good_qty: true,
      defect_qty: true,
      priority: true,
      status: true,
      create_by: true,
      create_dt: true,
      item: { select: { item_nm: true } },
      prod_plan: { select: { plan_no: true } },
      wo_processes: {
        select: {
          wo_process_id: true,
          process_cd: true,
          seq_no: true,
          equip_cd: true,
          status: true,
          process: { select: { process_nm: true } },
        },
        orderBy: { seq_no: 'asc' },
      },
    },
  });

  if (!order) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Fetch BOM forward tree for the item
  let bomTree: any[] = [];
  try {
    bomTree = await getForwardTree(order.item_cd);
  } catch {
    // BOM may not exist for the item — not an error
  }

  // Create PDF document (using built-in Helvetica — no Korean font needed)
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // ── Header ──
  doc.fontSize(18).text('Work Order', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`WO No: ${order.wo_no}`, { align: 'center' });
  doc.moveDown(1);

  // ── Basic Info Table ──
  doc.fontSize(12).fillColor('#000').text('Basic Information', { underline: true });
  doc.moveDown(0.5);

  const info: [string, string][] = [
    ['WO No', order.wo_no],
    ['Item Code', order.item_cd],
    ['Item Name', order.item?.item_nm ?? '-'],
    ['Order Qty', order.order_qty != null ? Number(order.order_qty).toLocaleString() : '-'],
    ['Good Qty', order.good_qty != null ? Number(order.good_qty).toLocaleString() : '0'],
    ['Defect Qty', order.defect_qty != null ? Number(order.defect_qty).toLocaleString() : '0'],
    ['Priority', PRIORITY_LABEL[order.priority] ?? String(order.priority)],
    ['Status', STATUS_LABEL_EN[order.status] ?? order.status],
    ['Plan No', order.prod_plan?.plan_no ?? '-'],
    ['Created By', order.create_by ?? '-'],
    ['Created At', order.create_dt ? new Date(order.create_dt).toISOString().slice(0, 19).replace('T', ' ') : '-'],
  ];

  const leftCol = 50;
  const rightCol = 170;
  doc.fontSize(10);
  for (const [label, value] of info) {
    const y = doc.y;
    doc.fillColor('#333').text(label, leftCol, y, { width: 110, continued: false });
    doc.fillColor('#000').text(value, rightCol, y);
  }
  doc.moveDown(1);

  // ── Process List ──
  doc.fontSize(12).fillColor('#000').text('Process List', { underline: true });
  doc.moveDown(0.5);

  if (order.wo_processes.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No processes assigned.');
  } else {
    const tableTop = doc.y;
    const colSeq = 50;
    const colCode = 100;
    const colName = 220;
    const colEquip = 360;
    const colStatus = 450;

    doc.fontSize(9).fillColor('#333');
    doc.text('Seq', colSeq, tableTop);
    doc.text('Process Code', colCode, tableTop);
    doc.text('Process Name', colName, tableTop);
    doc.text('Equipment', colEquip, tableTop);
    doc.text('Status', colStatus, tableTop);

    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    doc.fillColor('#000');
    for (const proc of order.wo_processes) {
      if (doc.y > 750) {
        doc.addPage();
      }
      const rowY = doc.y;
      doc.text(String(proc.seq_no), colSeq, rowY);
      doc.text(proc.process_cd, colCode, rowY);
      doc.text(proc.process?.process_nm ?? '-', colName, rowY);
      doc.text(proc.equip_cd ?? '-', colEquip, rowY);
      doc.text(STATUS_LABEL_EN[proc.status] ?? proc.status, colStatus, rowY);
      doc.moveDown(0.2);
    }
  }
  doc.moveDown(1);

  // ── BOM (Material List) ──
  if (doc.y > 680) doc.addPage();

  doc.fontSize(12).fillColor('#000').text('Bill of Materials', { underline: true });
  doc.moveDown(0.5);

  if (bomTree.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No BOM data available.');
  } else {
    const bomTop = doc.y;
    const bColDepth = 50;
    const bColParent = 100;
    const bColChild = 220;
    const bColChildNm = 340;
    const bColQty = 460;

    doc.fontSize(9).fillColor('#333');
    doc.text('Depth', bColDepth, bomTop);
    doc.text('Parent Item', bColParent, bomTop);
    doc.text('Child Item', bColChild, bomTop);
    doc.text('Child Name', bColChildNm, bomTop);
    doc.text('Qty', bColQty, bomTop);

    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    doc.fillColor('#000');
    for (const row of bomTree) {
      if (doc.y > 750) doc.addPage();
      const y = doc.y;
      doc.text(String(row.tree_depth ?? row.treeDepth ?? '-'), bColDepth, y);
      doc.text(String(row.parent_item_cd ?? row.parentItemCd ?? '-'), bColParent, y);
      doc.text(String(row.child_item_cd ?? row.childItemCd ?? '-'), bColChild, y);
      doc.text(String(row.child_item_nm ?? row.childItemNm ?? '-'), bColChildNm, y);
      doc.text(row.qty != null ? Number(row.qty).toString() : '-', bColQty, y);
      doc.moveDown(0.2);
    }
  }

  // ── Footer ──
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#aaa').text(
    `Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
    { align: 'right' },
  );

  doc.end();
  return doc;
}

// ─── Worker Assignment ───

export async function getAssignments(woId: number) {
  const order = await prisma.tbWorkOrder.findUnique({ where: { wo_id: woId } });
  if (!order) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  const assignments = await prisma.tbWoWorker.findMany({
    where: { wo_id: woId },
    include: {
      worker: {
        select: { worker_id: true, worker_nm: true, dept_cd: true, workshop_cd: true },
      },
    },
    orderBy: { assign_dt: 'asc' },
  });

  return assignments.map((a) => ({
    wo_id: a.wo_id,
    worker_id: a.worker_id,
    worker_nm: a.worker?.worker_nm ?? null,
    dept_cd: a.worker?.dept_cd ?? null,
    workshop_cd: a.worker?.workshop_cd ?? null,
    assign_dt: a.assign_dt,
  }));
}

export async function assignWorkers(woId: number, workerIds: string[], userId?: string) {
  if (!workerIds || workerIds.length === 0) {
    throw new AppError('배정할 작업자를 선택해주세요.', 400);
  }

  const order = await prisma.tbWorkOrder.findUnique({ where: { wo_id: woId } });
  if (!order) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Validate that all worker IDs exist
  const existingWorkers = await prisma.tbWorker.findMany({
    where: { worker_id: { in: workerIds } },
    select: { worker_id: true },
  });
  if (existingWorkers.length !== workerIds.length) {
    throw new AppError('존재하지 않는 작업자 ID가 포함되어 있습니다.', 400);
  }

  await prisma.tbWoWorker.createMany({
    data: workerIds.map((id) => ({
      wo_id: woId,
      worker_id: id,
      create_by: userId ?? null,
      update_by: userId ?? null,
    })),
    skipDuplicates: true,
  });

  return getAssignments(woId);
}

export async function unassignWorker(woId: number, workerId: string) {
  const order = await prisma.tbWorkOrder.findUnique({ where: { wo_id: woId } });
  if (!order) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  await prisma.tbWoWorker.delete({
    where: { wo_id_worker_id: { wo_id: woId, worker_id: workerId } },
  });

  return { success: true };
}

// ─── Worker Availability (Skill + Conflict Check) ───

export async function getWorkerAvailability(woId: number) {
  // Verify work order exists and get its processes
  const workOrder = await prisma.tbWorkOrder.findUnique({
    where: { wo_id: woId },
    select: {
      wo_id: true,
      item_cd: true,
      wo_processes: {
        select: { process_cd: true },
      },
    },
  });
  if (!workOrder) throw new AppError('존재하지 않는 작업지시입니다.', 404);

  // Collect process codes required for this work order
  const requiredProcessCodes = workOrder.wo_processes.map((p) => p.process_cd);

  // Fetch all active workers with their skills and current assignments (excluding this WO)
  const workers = await prisma.tbWorker.findMany({
    where: { use_yn: 'Y' },
    select: {
      worker_id: true,
      worker_nm: true,
      dept_cd: true,
      workshop_cd: true,
      skills: {
        select: {
          process_cd: true,
          skill_level: true,
        },
      },
      wo_workers: {
        where: {
          wo_id: { not: woId },
        },
        select: {
          wo_id: true,
          work_order: {
            select: {
              wo_id: true,
              wo_no: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { worker_id: 'asc' },
  });

  // Map workers with skill match and conflict info
  return workers.map((worker) => {
    // Find conflicting work orders (only WAIT or PROGRESS status)
    const conflictingWos = worker.wo_workers
      .filter((ww) => ww.work_order && ['WAIT', 'PROGRESS'].includes(ww.work_order.status))
      .map((ww) => ({
        wo_id: ww.work_order!.wo_id,
        wo_no: ww.work_order!.wo_no,
        status: ww.work_order!.status,
      }));

    // Check if worker has all required skills for this work order's processes
    const workerSkillCodes = new Set(worker.skills.map((s) => s.process_cd));
    const missingSkills = requiredProcessCodes.filter((pc) => !workerSkillCodes.has(pc));

    return {
      worker_id: worker.worker_id,
      worker_nm: worker.worker_nm,
      dept_cd: worker.dept_cd,
      workshop_cd: worker.workshop_cd,
      skills: worker.skills,
      has_required_skills: missingSkills.length === 0,
      missing_skills: missingSkills,
      conflicting_wos: conflictingWos,
      has_conflict: conflictingWos.length > 0,
    };
  });
}
