import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as prodResultService from '../services/prodResultService';

// ─── List Production Results (paginated) ───

export async function listProdResultsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await prodResultService.listProdResults(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Production Result by ID ───

export async function getProdResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resultId = parseInt(req.params.resultId as string, 10);
    if (isNaN(resultId)) {
      res.status(400).json(errorResponse('유효하지 않은 생산실적 ID입니다.'));
      return;
    }
    const result = await prodResultService.getProdResultById(resultId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Create Production Result ───

export async function createProdResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wo_id, equip_cd, worker_id, good_qty, defect_qty, work_start_dt, work_end_dt, auto_lot } = req.body;

    // Required field validation
    if (wo_id == null || good_qty == null || defect_qty == null) {
      res.status(400).json(errorResponse('wo_id, good_qty, defect_qty는 필수 항목입니다.'));
      return;
    }

    const result = await prodResultService.createProdResult(
      {
        wo_id: Number(wo_id),
        equip_cd: equip_cd ?? null,
        worker_id: worker_id ?? null,
        good_qty: Number(good_qty),
        defect_qty: Number(defect_qty),
        work_start_dt: work_start_dt ?? null,
        work_end_dt: work_end_dt ?? null,
        auto_lot: !!auto_lot,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Update Production Result ───

export async function updateProdResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resultId = parseInt(req.params.resultId as string, 10);
    if (isNaN(resultId)) {
      res.status(400).json(errorResponse('유효하지 않은 생산실적 ID입니다.'));
      return;
    }

    const { equip_cd, worker_id, good_qty, defect_qty, work_start_dt, work_end_dt } = req.body;

    const result = await prodResultService.updateProdResult(
      resultId,
      {
        equip_cd,
        worker_id,
        good_qty: good_qty !== undefined ? Number(good_qty) : undefined,
        defect_qty: defect_qty !== undefined ? Number(defect_qty) : undefined,
        work_start_dt,
        work_end_dt,
      },
      req.user?.loginId,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Production Result ───

export async function deleteProdResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resultId = parseInt(req.params.resultId as string, 10);
    if (isNaN(resultId)) {
      res.status(400).json(errorResponse('유효하지 않은 생산실적 ID입니다.'));
      return;
    }
    const result = await prodResultService.deleteProdResult(resultId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
