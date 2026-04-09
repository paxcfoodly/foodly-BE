import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as materialInputService from '../services/materialInputService';

// ─── List Material Inputs (paginated) ───

export async function listMaterialInputsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await materialInputService.listMaterialInputs(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Material Input by ID ───

export async function getMaterialInputHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inputId = parseInt(req.params.inputId as string, 10);
    if (isNaN(inputId)) {
      res.status(400).json(errorResponse('유효하지 않은 자재투입 ID입니다.'));
      return;
    }
    const result = await materialInputService.getMaterialInputById(inputId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Create Material Input ───

export async function createMaterialInputHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wo_id, item_cd, lot_no, input_qty, worker_id } = req.body;

    // Required field validation
    if (wo_id == null || item_cd == null || input_qty == null) {
      res.status(400).json(errorResponse('wo_id, item_cd, input_qty는 필수 항목입니다.'));
      return;
    }

    const result = await materialInputService.createMaterialInput(
      {
        wo_id: Number(wo_id),
        item_cd: String(item_cd),
        lot_no: lot_no ?? null,
        input_qty: Number(input_qty),
        worker_id: worker_id ?? null,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Material Input ───

export async function deleteMaterialInputHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inputId = parseInt(req.params.inputId as string, 10);
    if (isNaN(inputId)) {
      res.status(400).json(errorResponse('유효하지 않은 자재투입 ID입니다.'));
      return;
    }
    const result = await materialInputService.deleteMaterialInput(inputId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
