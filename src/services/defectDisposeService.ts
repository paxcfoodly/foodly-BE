import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

// ─── Status transition map ───
const DEFECT_TRANSITIONS: Record<string, string> = {
  REGISTERED: 'PROCESSING',
  PROCESSING: 'COMPLETED',
};

// ─── List Disposals ───

export async function listDisposals(defectId: number) {
  const defect = await prisma.tbDefect.findUnique({
    where: { defect_id: defectId },
  });
  if (!defect) throw new AppError('존재하지 않는 불량입니다.', 404);

  const disposals = await prisma.tbDefectDispose.findMany({
    where: { defect_id: defectId },
    select: {
      dispose_id: true,
      defect_id: true,
      dispose_type: true,
      dispose_qty: true,
      approve_by: true,
      approve_dt: true,
      remark: true,
      create_by: true,
      create_dt: true,
      update_by: true,
      update_dt: true,
    },
    orderBy: [{ dispose_id: 'asc' }],
  });

  return disposals.map((d) => ({
    ...d,
    dispose_qty: d.dispose_qty != null ? Number(d.dispose_qty) : 0,
  }));
}

// ─── Create Disposal ───

export interface DisposeCreateInput {
  dispose_type: string; // REWORK, SCRAP, CONCESSION
  dispose_qty: number;
  approve_by?: string | null; // Required for CONCESSION per D-04
  remark?: string | null;
}

export async function createDisposal(defectId: number, input: DisposeCreateInput, userId?: string) {
  // Fetch defect and verify it exists
  const defect = await prisma.tbDefect.findUnique({
    where: { defect_id: defectId },
  });
  if (!defect) throw new AppError('존재하지 않는 불량입니다.', 404);

  // Validate: CONCESSION requires approve_by
  if (input.dispose_type === 'CONCESSION' && !input.approve_by) {
    throw new AppError('특채 처리 시 승인자는 필수입니다.', 400);
  }

  // Determine next status from transition map
  const nextStatus = DEFECT_TRANSITIONS[defect.status];
  if (!nextStatus) {
    throw new AppError(`현재 상태(${defect.status})에서는 처리할 수 없습니다.`, 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // a. Create disposal record
    await tx.tbDefectDispose.create({
      data: {
        defect_id: defectId,
        dispose_type: input.dispose_type,
        dispose_qty: input.dispose_qty,
        approve_by: input.approve_by ?? null,
        approve_dt: input.dispose_type === 'CONCESSION' ? new Date() : null,
        remark: input.remark ?? null,
        create_by: userId,
        update_by: userId,
      },
    });

    // b. Update defect status to next status
    await tx.tbDefect.update({
      where: { defect_id: defectId },
      data: { status: nextStatus, update_by: userId },
    });

    // Return updated defect with disposals
    return tx.tbDefect.findUnique({
      where: { defect_id: defectId },
      select: {
        defect_id: true,
        defect_no: true,
        wo_id: true,
        item_cd: true,
        lot_no: true,
        defect_type_cd: true,
        defect_cause_cd: true,
        defect_qty: true,
        status: true,
        process_cd: true,
        remark: true,
        file_id: true,
        create_by: true,
        create_dt: true,
        update_by: true,
        update_dt: true,
        item: { select: { item_nm: true } },
        lot: { select: { lot_status: true } },
        work_order: { select: { wo_no: true } },
        disposals: {
          select: {
            dispose_id: true,
            dispose_type: true,
            dispose_qty: true,
            approve_by: true,
            approve_dt: true,
            remark: true,
            create_by: true,
            create_dt: true,
          },
          orderBy: { dispose_id: 'asc' as const },
        },
      },
    });
  });

  if (!result) throw new AppError('처리 중 오류가 발생했습니다.', 500);

  return {
    ...result,
    defect_qty: result.defect_qty != null ? Number(result.defect_qty) : 0,
    disposals: result.disposals?.map((d) => ({
      ...d,
      dispose_qty: d.dispose_qty != null ? Number(d.dispose_qty) : 0,
    })),
  };
}
