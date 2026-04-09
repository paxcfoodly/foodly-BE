import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as prodPlanService from '../services/prodPlanService';

// ─── List Prod Plans (paginated) ───

export async function listProdPlansHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await prodPlanService.listProdPlans(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Prod Plan by ID ───

export async function getProdPlanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const planId = parseInt(req.params.planId as string, 10);
    if (isNaN(planId)) {
      res.status(400).json(errorResponse('유효하지 않은 계획 ID입니다.'));
      return;
    }
    const plan = await prodPlanService.getProdPlanById(planId);
    res.json(successResponse(plan));
  } catch (err) {
    next(err);
  }
}

// ─── Create Prod Plan ───

export async function createProdPlanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { plant_cd, item_cd, plan_qty, due_date, priority } = req.body;

    // Required field validation
    if (!plant_cd || !item_cd || plan_qty == null || !due_date) {
      res.status(400).json(errorResponse('plant_cd, item_cd, plan_qty, due_date는 필수 항목입니다.'));
      return;
    }

    const plan = await prodPlanService.createProdPlan(
      {
        plant_cd,
        item_cd,
        plan_qty: Number(plan_qty),
        due_date,
        priority: priority != null ? Number(priority) : undefined,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(plan));
  } catch (err) {
    next(err);
  }
}

// ─── Update Prod Plan ───

export async function updateProdPlanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const planId = parseInt(req.params.planId as string, 10);
    if (isNaN(planId)) {
      res.status(400).json(errorResponse('유효하지 않은 계획 ID입니다.'));
      return;
    }

    const { plant_cd, item_cd, plan_qty, due_date, priority, status } = req.body;

    const plan = await prodPlanService.updateProdPlan(
      planId,
      {
        plant_cd,
        item_cd,
        plan_qty: plan_qty !== undefined ? Number(plan_qty) : undefined,
        due_date,
        priority: priority !== undefined ? Number(priority) : undefined,
        status,
      },
      req.user?.loginId,
    );
    res.json(successResponse(plan));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Prod Plan ───

export async function deleteProdPlanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const planId = parseInt(req.params.planId as string, 10);
    if (isNaN(planId)) {
      res.status(400).json(errorResponse('유효하지 않은 계획 ID입니다.'));
      return;
    }
    const result = await prodPlanService.deleteProdPlan(planId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Material Availability Check ───

export async function materialCheckHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const planId = parseInt(req.params.planId as string, 10);
    if (isNaN(planId)) {
      res.status(400).json(errorResponse('유효하지 않은 계획 ID입니다.'));
      return;
    }
    const result = await prodPlanService.checkMaterialAvailability(planId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Confirm Plan ───

export async function confirmPlanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const planId = parseInt(req.params.planId as string, 10);
    if (isNaN(planId)) {
      res.status(400).json(errorResponse('유효하지 않은 계획 ID입니다.'));
      return;
    }
    const result = await prodPlanService.confirmPlan(planId, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
