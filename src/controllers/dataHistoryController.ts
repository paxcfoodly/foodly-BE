import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../types/apiResponse';
import { AppError } from '../middlewares/errorHandler';
import { getDataHistory } from '../services/dataHistoryService';

/**
 * GET /api/v1/data-history?table=TB_ITEM&recordId=xxx&page=1&limit=50
 * Returns change history for a specific table (and optionally a specific record).
 */
export async function queryDataHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = req.query.table as string | undefined;
    if (!table) {
      throw new AppError('table 파라미터는 필수입니다.', 400);
    }

    const recordId = req.query.recordId as string | undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    if (isNaN(page) || page < 1) {
      throw new AppError('page는 1 이상의 숫자여야 합니다.', 400);
    }
    if (isNaN(limit) || limit < 1 || limit > 200) {
      throw new AppError('limit는 1~200 사이의 숫자여야 합니다.', 400);
    }

    const result = await getDataHistory(table, recordId, { page, limit });
    res.json(successResponse(result.items, result.pagination));
  } catch (err) {
    next(err);
  }
}
