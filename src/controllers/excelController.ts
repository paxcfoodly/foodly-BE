import { Request, Response, NextFunction } from 'express';
import { exportToExcel, ExcelColumn } from '../utils/excel';
import { AppError } from '../middlewares/errorHandler';

/**
 * POST /api/v1/excel/export
 * Body: { columns: ExcelColumn[], data: Record[], filename: string }
 *
 * Generic endpoint — callers specify the columns and data to export.
 * Domain-specific routes can call exportToExcel() directly from their controller.
 */
export async function excelExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { columns, data, filename } = req.body as {
      columns?: ExcelColumn[];
      data?: Record<string, unknown>[];
      filename?: string;
    };

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      throw new AppError('columns 배열이 필요합니다.', 400);
    }
    if (!data || !Array.isArray(data)) {
      throw new AppError('data 배열이 필요합니다.', 400);
    }

    await exportToExcel(res, columns, data, filename ?? 'export');
  } catch (err) {
    next(err);
  }
}
