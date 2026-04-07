import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../types/apiResponse';
import { getCodeGroups, getCodesByGroup } from '../services/commonCodeService';

/**
 * GET /api/v1/common-codes
 * Returns all active code groups.
 */
export async function listCodeGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await getCodeGroups();
    res.json(successResponse(groups));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/common-codes/:groupCd
 * Returns codes belonging to the specified group.
 */
export async function listCodesByGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string;
    const codes = await getCodesByGroup(groupCd);
    res.json(successResponse(codes));
  } catch (err) {
    next(err);
  }
}
