import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as demandService from '../services/demandService';

// ─── List Demands (paginated) ───

export async function listDemandsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await demandService.listDemands(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Demand by ID ───

export async function getDemandHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const demandId = parseInt(req.params.demandId as string, 10);
    if (isNaN(demandId)) {
      res.status(400).json(errorResponse('유효하지 않은 수요 ID입니다.'));
      return;
    }
    const demand = await demandService.getDemand(demandId);
    res.json(successResponse(demand));
  } catch (err) {
    next(err);
  }
}

// ─── Create Demand ───

export async function createDemandHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, demand_qty, due_date, cust_cd, remark } = req.body;

    if (!item_cd || demand_qty == null) {
      res.status(400).json(errorResponse('item_cd, demand_qty는 필수 항목입니다.'));
      return;
    }

    const demand = await demandService.createDemand(
      {
        item_cd,
        demand_qty: Number(demand_qty),
        due_date,
        cust_cd,
        remark,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(demand));
  } catch (err) {
    next(err);
  }
}

// ─── Update Demand ───

export async function updateDemandHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const demandId = parseInt(req.params.demandId as string, 10);
    if (isNaN(demandId)) {
      res.status(400).json(errorResponse('유효하지 않은 수요 ID입니다.'));
      return;
    }

    const { item_cd, demand_qty, due_date, cust_cd, remark, status } = req.body;

    const demand = await demandService.updateDemand(
      demandId,
      {
        item_cd,
        demand_qty: demand_qty !== undefined ? Number(demand_qty) : undefined,
        due_date,
        cust_cd,
        remark,
        status,
      },
      req.user?.loginId,
    );
    res.json(successResponse(demand));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Demand ───

export async function deleteDemandHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const demandId = parseInt(req.params.demandId as string, 10);
    if (isNaN(demandId)) {
      res.status(400).json(errorResponse('유효하지 않은 수요 ID입니다.'));
      return;
    }
    const result = await demandService.deleteDemand(demandId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Create Draft Plan from Demand ───

export async function createDraftPlanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const demandId = parseInt(req.params.demandId as string, 10);
    if (isNaN(demandId)) {
      res.status(400).json(errorResponse('유효하지 않은 수요 ID입니다.'));
      return;
    }

    const { plant_cd, plan_qty, due_date } = req.body;

    if (!plant_cd) {
      res.status(400).json(errorResponse('plant_cd는 필수 항목입니다.'));
      return;
    }

    const plan = await demandService.createDraftPlanFromDemand(
      demandId,
      {
        plant_cd,
        plan_qty: plan_qty != null ? Number(plan_qty) : undefined,
        due_date,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(plan));
  } catch (err) {
    next(err);
  }
}
