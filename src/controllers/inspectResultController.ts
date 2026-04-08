import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as inspectResultService from '../services/inspectResultService';

// ─── List Inspect Results (paginated) ───

export async function listInspectResultsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inspectResultService.listInspectResults(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Inspect Result by ID ───

export async function getInspectResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inspectId = parseInt(req.params.inspectId as string, 10);
    if (isNaN(inspectId)) {
      res.status(400).json(errorResponse('유효하지 않은 검사결과 ID입니다.'));
      return;
    }
    const result = await inspectResultService.getInspectResultById(inspectId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Get Inspection Standards (for FE form population) ───

export async function getInspectionStandardsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, inspect_type, process_cd } = req.query;

    if (!item_cd || !inspect_type) {
      res.status(400).json(errorResponse('item_cd와 inspect_type은 필수 항목입니다.'));
      return;
    }

    const standards = await inspectResultService.getStandardsForInspection(
      item_cd as string,
      inspect_type as string,
      process_cd as string | undefined,
    );
    res.json(successResponse(standards));
  } catch (err) {
    next(err);
  }
}

// ─── Create Inspect Result ───

export async function createInspectResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { inspect_type, item_cd, lot_no, wo_id, process_cd, remark, details } = req.body;

    if (!inspect_type) {
      res.status(400).json(errorResponse('inspect_type은 필수 항목입니다.'));
      return;
    }
    if (!item_cd) {
      res.status(400).json(errorResponse('item_cd는 필수 항목입니다.'));
      return;
    }
    if (!lot_no) {
      res.status(400).json(errorResponse('lot_no는 필수 항목입니다.'));
      return;
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      res.status(400).json(errorResponse('details 배열은 필수 항목입니다.'));
      return;
    }

    const result = await inspectResultService.createInspectResult(
      {
        inspect_type,
        item_cd,
        lot_no,
        wo_id: wo_id != null ? Number(wo_id) : null,
        process_cd: process_cd ?? null,
        remark: remark ?? null,
        details: details.map((d: any) => ({
          inspect_std_id: Number(d.inspect_std_id),
          measure_value: d.measure_value != null ? Number(d.measure_value) : null,
        })),
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Inspect Result ───

export async function deleteInspectResultHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inspectId = parseInt(req.params.inspectId as string, 10);
    if (isNaN(inspectId)) {
      res.status(400).json(errorResponse('유효하지 않은 검사결과 ID입니다.'));
      return;
    }
    const result = await inspectResultService.deleteInspectResult(inspectId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
