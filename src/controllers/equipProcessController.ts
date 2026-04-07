import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as equipProcessService from '../services/equipProcessService';

// ─── List Equipment by Process ───

export async function listEquipsByProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const mappings = await equipProcessService.listEquipsByProcess(processCd);
    res.json(successResponse(mappings));
  } catch (err) {
    next(err);
  }
}

// ─── Add Equipment to Process ───

export async function addEquipToProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const { equip_cd, priority } = req.body;

    if (!equip_cd) {
      res.status(400).json(errorResponse('equip_cd는 필수 항목입니다.'));
      return;
    }

    const mapping = await equipProcessService.addEquipToProcess(
      processCd,
      equip_cd,
      priority != null ? Number(priority) : 1,
      req.user?.loginId,
    );
    res.status(201).json(successResponse(mapping));
  } catch (err) {
    next(err);
  }
}

// ─── Remove Equipment from Process ───

export async function removeEquipFromProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const equipCd = req.params.equipCd as string;
    const result = await equipProcessService.removeEquipFromProcess(processCd, equipCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Update Equipment Mapping Priority ───

export async function updateEquipProcessPriorityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const equipCd = req.params.equipCd as string;
    const { priority } = req.body;

    if (priority == null) {
      res.status(400).json(errorResponse('priority는 필수 항목입니다.'));
      return;
    }

    const mapping = await equipProcessService.updateEquipProcessPriority(
      processCd,
      equipCd,
      Number(priority),
      req.user?.loginId,
    );
    res.json(successResponse(mapping));
  } catch (err) {
    next(err);
  }
}
