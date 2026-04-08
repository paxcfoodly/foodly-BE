import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as spcService from '../services/spcService';

// ─── GET /spc/xbar-r ───

export async function getSpcDataHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { inspect_std_id, subgroup_size, start_date, end_date } = req.query;

    if (!inspect_std_id) {
      res.status(400).json(errorResponse('inspect_std_id는 필수 항목입니다.'));
      return;
    }

    const inspectStdId = parseInt(inspect_std_id as string, 10);
    if (isNaN(inspectStdId)) {
      res.status(400).json(errorResponse('inspect_std_id가 유효하지 않습니다.'));
      return;
    }

    const subgroupSize = subgroup_size ? parseInt(subgroup_size as string, 10) : 5;
    if (isNaN(subgroupSize) || subgroupSize < 2 || subgroupSize > 10) {
      res.status(400).json(errorResponse('subgroup_size는 2-10 사이의 정수여야 합니다.'));
      return;
    }

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const result = await spcService.calculateSpc(inspectStdId, subgroupSize, startDate, endDate);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /spc/inspect-stds ───

export async function getSpcInspectStdsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd } = req.query;
    const result = await spcService.getInspectStdsForSpc(item_cd as string | undefined);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
