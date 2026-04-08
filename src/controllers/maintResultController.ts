import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as maintResultService from '../services/maintResultService';

// ─── Create Maintenance Result ───

export async function createMaintResultHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { equip_cd } = req.body;
    if (!equip_cd) {
      res.status(400).json(errorResponse('equip_cd는 필수 항목입니다.'));
      return;
    }
    const result = await maintResultService.createMaintResult(req.body, req.user?.loginId);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── List Maintenance Results ───

export async function listMaintResultsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await maintResultService.listMaintResults(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Maintenance Result ───

export async function getMaintResultHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json(errorResponse('유효하지 않은 ID입니다.'));
      return;
    }
    const result = await maintResultService.getMaintResultById(id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Maintenance Result ───

export async function deleteMaintResultHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json(errorResponse('유효하지 않은 ID입니다.'));
      return;
    }
    const result = await maintResultService.deleteMaintResult(id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
