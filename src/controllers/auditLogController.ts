import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';
import { parseSort } from '../utils/sorting';
import * as auditLogService from '../services/auditLogService';

const ALLOWED_SORT_FIELDS = ['log_id', 'action', 'target_table', 'create_dt'];

/**
 * GET /api/v1/audit-logs
 * Query params: page, limit, sort, user_id, action, target_table, start_dt, end_dt
 */
export async function listAuditLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req);
    const orderBy = parseSort(req, ALLOWED_SORT_FIELDS);

    const where: Record<string, unknown> = {};

    // Filter by user_id
    const userId = req.query.user_id;
    if (userId) {
      const parsed = parseInt(userId as string, 10);
      if (!isNaN(parsed)) where.user_id = parsed;
    }

    // Filter by action
    const action = req.query.action as string;
    if (action) where.action = action;

    // Filter by target_table
    const targetTable = req.query.target_table as string;
    if (targetTable) where.target_table = targetTable;

    // Filter by date range
    const startDt = req.query.start_dt as string;
    const endDt = req.query.end_dt as string;
    if (startDt || endDt) {
      const dtFilter: Record<string, Date> = {};
      if (startDt) dtFilter.gte = new Date(startDt);
      if (endDt) {
        const end = new Date(endDt);
        end.setHours(23, 59, 59, 999);
        dtFilter.lte = end;
      }
      where.create_dt = dtFilter;
    }

    const result = await auditLogService.listAuditLogs({
      ...pagination,
      where,
      orderBy,
    });

    const paginated = buildPaginatedResponse(result.logs, result.total, result.page, result.limit);
    res.json(successResponse(paginated.data, paginated.pagination));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/audit-logs/:id
 */
export async function getAuditLogHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logId = parseInt(req.params.id as string, 10);
    if (isNaN(logId)) {
      res.status(400).json(errorResponse('유효하지 않은 로그 ID입니다.'));
      return;
    }
    const log = await auditLogService.getAuditLogById(logId);
    if (!log) {
      res.status(404).json(errorResponse('로그를 찾을 수 없습니다.'));
      return;
    }
    res.json(successResponse(log));
  } catch (err) {
    next(err);
  }
}
