import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as reportsService from '../services/reportsService';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string): boolean {
  return ISO_DATE_RE.test(s) && !isNaN(Date.parse(s));
}

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
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json(errorResponse('start, end는 YYYY-MM-DD 형식이어야 합니다.'));
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

// ─── GET /v1/reports/quality/pareto ───

export async function getQualityParetoHandler(
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
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json(errorResponse('start, end는 YYYY-MM-DD 형식이어야 합니다.'));
      return;
    }
    const result = await reportsService.getQualityPareto(start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /v1/reports/quality/by-process ───

export async function getQualityByProcessHandler(
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
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json(errorResponse('start, end는 YYYY-MM-DD 형식이어야 합니다.'));
      return;
    }
    const result = await reportsService.getQualityByProcess(start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /v1/reports/quality/trend ───

export async function getQualityTrendHandler(
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
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json(errorResponse('start, end는 YYYY-MM-DD 형식이어야 합니다.'));
      return;
    }
    const result = await reportsService.getQualityTrend(start, end);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /v1/reports/quality/detail ───

export async function getQualityDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { start, end, defect_type_cd } = req.query as {
      start?: string;
      end?: string;
      defect_type_cd?: string;
    };
    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json(errorResponse('start, end는 YYYY-MM-DD 형식이어야 합니다.'));
      return;
    }
    const result = await reportsService.getQualityDetail(start, end, defect_type_cd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /v1/reports/inventory/summary ───

export async function getInventorySummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { wh_cd, item_cd, stagnant_only } = req.query as {
      wh_cd?: string;
      item_cd?: string;
      stagnant_only?: string;
    };
    let result = await reportsService.getInventorySummary(wh_cd, item_cd);
    if (stagnant_only === 'true') {
      result = result.filter((r) => r.is_stagnant);
    }
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
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json(errorResponse('start, end는 YYYY-MM-DD 형식이어야 합니다.'));
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
