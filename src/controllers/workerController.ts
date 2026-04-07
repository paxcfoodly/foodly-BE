import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as workerService from '../services/workerService';

// ─── List Workers (paginated) ───

export async function listWorkersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await workerService.listWorkers(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Worker by ID ───

export async function getWorkerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workerId = req.params.workerId as string;
    const worker = await workerService.getWorkerById(workerId);
    res.json(successResponse(worker));
  } catch (err) {
    next(err);
  }
}

// ─── Create Worker ───

export async function createWorkerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { worker_id, worker_nm, dept_cd, workshop_cd, shift_cd, use_yn } = req.body;

    if (!worker_id || !worker_nm) {
      res.status(400).json(errorResponse('worker_id, worker_nm은 필수 항목입니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const worker = await workerService.createWorker(
      {
        worker_id,
        worker_nm,
        dept_cd: dept_cd ?? null,
        workshop_cd: workshop_cd ?? null,
        shift_cd: shift_cd ?? null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(worker));
  } catch (err) {
    next(err);
  }
}

// ─── Update Worker ───

export async function updateWorkerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workerId = req.params.workerId as string;
    const { worker_nm, dept_cd, workshop_cd, shift_cd, use_yn } = req.body;

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const worker = await workerService.updateWorker(
      workerId,
      { worker_nm, dept_cd, workshop_cd, shift_cd, use_yn },
      req.user?.loginId,
    );
    res.json(successResponse(worker));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Worker ───

export async function deleteWorkerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workerId = req.params.workerId as string;
    const result = await workerService.deleteWorker(workerId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
