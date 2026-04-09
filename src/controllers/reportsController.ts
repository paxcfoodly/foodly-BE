import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as reportsService from '../services/reportsService';

// ─── GET /v1/reports/production/daily ───

export async function getProductionDailyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      start,
      end,
      group_by,
      item_cd,
      workshop_cd,
      worker_id,
    } = req.query as {
      start?: string;
      end?: string;
      group_by?: string;
      item_cd?: string;
      workshop_cd?: string;
      worker_id?: string;
    };

    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }

    const groupBy = group_by ?? 'item';
    const result = await reportsService.getProductionDaily(
      start,
      end,
      groupBy,
      item_cd,
      workshop_cd,
      worker_id,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /v1/reports/production/summary ───

export async function getProductionSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      start,
      end,
      group_by,
      item_cd,
      workshop_cd,
      worker_id,
    } = req.query as {
      start?: string;
      end?: string;
      group_by?: string;
      item_cd?: string;
      workshop_cd?: string;
      worker_id?: string;
    };

    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }

    const groupBy = group_by ?? 'item';
    const result = await reportsService.getProductionSummary(
      start,
      end,
      groupBy,
      item_cd,
      workshop_cd,
      worker_id,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
