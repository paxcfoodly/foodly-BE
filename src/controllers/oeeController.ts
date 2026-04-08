import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as oeeService from '../services/oeeService';

// ─── OEE Summary (all equipment) ───

export async function getOeeSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }
    const result = await oeeService.getOeeSummary(start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── OEE Detail (single equipment) ───

export async function getOeeDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const equipCd = req.params.equipCd as string;
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }
    const result = await oeeService.calculateOee(equipCd, start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── OEE Trend ───

export async function getOeeTrendHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { equip_cd, start, end } = req.query as { equip_cd?: string; start?: string; end?: string };
    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }
    const result = await oeeService.getOeeTrend(equip_cd ?? null, start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Down Reason Summary ───

export async function getDownReasonSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { equip_cd, start, end } = req.query as { equip_cd?: string; start?: string; end?: string };
    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }
    const result = await oeeService.getDownReasonSummary(equip_cd ?? null, start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
