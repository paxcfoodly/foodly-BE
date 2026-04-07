import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as inspectStdService from '../services/inspectStdService';

// ─── List InspectStds (paginated) ───

export async function listInspectStdsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inspectStdService.listInspectStds(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get InspectStd by ID ───

export async function getInspectStdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inspectStdId = parseInt(req.params.inspectStdId as string, 10);
    if (isNaN(inspectStdId)) {
      res.status(400).json(errorResponse('inspect_std_id는 숫자여야 합니다.'));
      return;
    }
    const inspectStd = await inspectStdService.getInspectStdById(inspectStdId);
    res.json(successResponse(inspectStd));
  } catch (err) {
    next(err);
  }
}

// ─── Create InspectStd ───

export async function createInspectStdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, process_cd, inspect_type, inspect_item_nm, measure_type, lsl, target_val, usl, unit, sampling_std, use_yn } = req.body;

    if (!inspect_item_nm) {
      res.status(400).json(errorResponse('inspect_item_nm은 필수 항목입니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const inspectStd = await inspectStdService.createInspectStd(
      {
        item_cd: item_cd ?? null,
        process_cd: process_cd ?? null,
        inspect_type: inspect_type ?? null,
        inspect_item_nm,
        measure_type: measure_type ?? null,
        lsl: lsl != null ? parseFloat(lsl) : null,
        target_val: target_val != null ? parseFloat(target_val) : null,
        usl: usl != null ? parseFloat(usl) : null,
        unit: unit ?? null,
        sampling_std: sampling_std ?? null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(inspectStd));
  } catch (err) {
    next(err);
  }
}

// ─── Update InspectStd ───

export async function updateInspectStdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inspectStdId = parseInt(req.params.inspectStdId as string, 10);
    if (isNaN(inspectStdId)) {
      res.status(400).json(errorResponse('inspect_std_id는 숫자여야 합니다.'));
      return;
    }

    const { item_cd, process_cd, inspect_type, inspect_item_nm, measure_type, lsl, target_val, usl, unit, sampling_std, use_yn } = req.body;

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const inspectStd = await inspectStdService.updateInspectStd(
      inspectStdId,
      {
        item_cd,
        process_cd,
        inspect_type,
        inspect_item_nm,
        measure_type,
        lsl: lsl !== undefined ? (lsl != null ? parseFloat(lsl) : null) : undefined,
        target_val: target_val !== undefined ? (target_val != null ? parseFloat(target_val) : null) : undefined,
        usl: usl !== undefined ? (usl != null ? parseFloat(usl) : null) : undefined,
        unit,
        sampling_std,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(inspectStd));
  } catch (err) {
    next(err);
  }
}

// ─── Delete InspectStd ───

export async function deleteInspectStdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inspectStdId = parseInt(req.params.inspectStdId as string, 10);
    if (isNaN(inspectStdId)) {
      res.status(400).json(errorResponse('inspect_std_id는 숫자여야 합니다.'));
      return;
    }
    const result = await inspectStdService.deleteInspectStd(inspectStdId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
