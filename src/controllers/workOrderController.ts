import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as workOrderService from '../services/workOrderService';

// ─── List Work Orders (paginated) ───

export async function listWorkOrdersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await workOrderService.listWorkOrders(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Work Order by ID ───

export async function getWorkOrderHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }
    const order = await workOrderService.getWorkOrderById(woId);
    res.json(successResponse(order));
  } catch (err) {
    next(err);
  }
}

// ─── Create Work Order ───

export async function createWorkOrderHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { plan_id, item_cd, order_qty, priority } = req.body;

    // Required field validation
    if (!item_cd || order_qty == null) {
      res.status(400).json(errorResponse('item_cd, order_qty는 필수 항목입니다.'));
      return;
    }

    const order = await workOrderService.createWorkOrder(
      {
        plan_id: plan_id != null ? Number(plan_id) : null,
        item_cd,
        order_qty: Number(order_qty),
        priority: priority != null ? Number(priority) : undefined,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(order));
  } catch (err) {
    next(err);
  }
}

// ─── Update Work Order ───

export async function updateWorkOrderHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }

    const { plan_id, item_cd, order_qty, priority } = req.body;

    const order = await workOrderService.updateWorkOrder(
      woId,
      {
        plan_id: plan_id !== undefined ? (plan_id != null ? Number(plan_id) : null) : undefined,
        item_cd,
        order_qty: order_qty !== undefined ? Number(order_qty) : undefined,
        priority: priority !== undefined ? Number(priority) : undefined,
      },
      req.user?.loginId,
    );
    res.json(successResponse(order));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Work Order ───

export async function deleteWorkOrderHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }
    const result = await workOrderService.deleteWorkOrder(woId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Split Work Order ───

export async function splitHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }

    const { split_qty } = req.body;
    if (split_qty == null) {
      res.status(400).json(errorResponse('split_qty는 필수 항목입니다.'));
      return;
    }

    const result = await workOrderService.splitWorkOrder(woId, Number(split_qty), req.user?.loginId);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Download PDF ───

export async function downloadPdfHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }

    const pdfStream = await workOrderService.generatePdf(woId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="work-order-${woId}.pdf"`);
    pdfStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

// ─── Get Assignments ───

export async function getAssignmentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }
    const assignments = await workOrderService.getAssignments(woId);
    res.json(successResponse(assignments));
  } catch (err) {
    next(err);
  }
}

// ─── Assign Workers ───

export async function assignWorkersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }

    const { worker_ids } = req.body;
    if (!worker_ids || !Array.isArray(worker_ids)) {
      res.status(400).json(errorResponse('worker_ids 배열은 필수 항목입니다.'));
      return;
    }

    const result = await workOrderService.assignWorkers(woId, worker_ids, req.user?.loginId);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Unassign Worker ───

export async function unassignWorkerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }

    const workerId = req.params.workerId as string;
    if (!workerId) {
      res.status(400).json(errorResponse('workerId는 필수 항목입니다.'));
      return;
    }

    const result = await workOrderService.unassignWorker(woId, workerId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Change Status ───

export async function changeStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }

    const { status } = req.body;
    if (!status) {
      res.status(400).json(errorResponse('status는 필수 항목입니다.'));
      return;
    }

    const result = await workOrderService.changeStatus(woId, status, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Get Worker Availability (Skill + Conflict Check) ───

export async function getWorkerAvailabilityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const woId = parseInt(req.params.woId as string, 10);
    if (isNaN(woId)) {
      res.status(400).json(errorResponse('유효하지 않은 작업지시 ID입니다.'));
      return;
    }
    const workers = await workOrderService.getWorkerAvailability(woId);
    res.json(successResponse(workers));
  } catch (err) {
    next(err);
  }
}
