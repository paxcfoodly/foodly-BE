import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as maintPlanService from '../services/maintPlanService';

// ─── Create Maintenance Plan ───

export async function createMaintPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { equip_cd, plan_nm } = req.body;
    if (!equip_cd || !plan_nm) {
      res.status(400).json(errorResponse('equip_cd, plan_nm은 필수 항목입니다.'));
      return;
    }
    const result = await maintPlanService.createMaintPlan(req.body, req.user?.loginId);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Update Maintenance Plan ───

export async function updateMaintPlanHandler(
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
    const result = await maintPlanService.updateMaintPlan(id, req.body, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Get Maintenance Plan ───

export async function getMaintPlanHandler(
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
    const result = await maintPlanService.getMaintPlanById(id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── List Maintenance Plans ───

export async function listMaintPlansHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await maintPlanService.listMaintPlans(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Maintenance Plan ───

export async function deleteMaintPlanHandler(
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
    const result = await maintPlanService.deleteMaintPlan(id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Get Today's Plan Count ───

export async function getTodayPlanCountHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await maintPlanService.getTodayPlanCount();
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Get Plans for Date Range (Calendar) ───

export async function getPlansForDateRangeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { start, end, equip_cd } = req.query as { start?: string; end?: string; equip_cd?: string };
    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }
    const result = await maintPlanService.getPlansForDateRange(start, end, equip_cd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
