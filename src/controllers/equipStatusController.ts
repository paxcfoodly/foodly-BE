import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as equipStatusService from '../services/equipStatusService';

const VALID_STATUS_TYPES = ['RUN', 'IDLE', 'DOWN', 'SETUP'];

// ─── Change Equipment Status ───

export async function changeEquipStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { equip_cd, status_type, down_reason_cd, memo } = req.body;

    if (!equip_cd) {
      res.status(400).json(errorResponse('equip_cd는 필수 항목입니다.'));
      return;
    }
    if (!status_type) {
      res.status(400).json(errorResponse('status_type은 필수 항목입니다.'));
      return;
    }
    if (!VALID_STATUS_TYPES.includes(status_type)) {
      res.status(400).json(errorResponse(`status_type은 ${VALID_STATUS_TYPES.join(', ')} 중 하나여야 합니다.`));
      return;
    }

    const result = await equipStatusService.changeEquipStatus(
      { equip_cd, status_type, down_reason_cd, memo },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── List Equipment Statuses ───

export async function listEquipStatusesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await equipStatusService.listEquipStatuses(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Current Status for Single Equipment ───

export async function getEquipmentCurrentStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const equipCd = req.params.equipCd as string;
    const status = await equipStatusService.getEquipmentCurrentStatus(equipCd);
    res.json(successResponse(status));
  } catch (err) {
    next(err);
  }
}

// ─── Get Status Timeline ───

export async function getEquipmentStatusTimelineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const equipCd = req.params.equipCd as string;
    const { start, end } = req.query as { start?: string; end?: string };

    if (!start || !end) {
      res.status(400).json(errorResponse('start, end 쿼리 파라미터가 필요합니다.'));
      return;
    }

    const timeline = await equipStatusService.getEquipmentStatusTimeline(equipCd, start, end);
    res.json(successResponse(timeline));
  } catch (err) {
    next(err);
  }
}

// ─── List Equipments with Current Status ───

export async function listEquipmentsWithCurrentStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await equipStatusService.listEquipmentsWithCurrentStatus(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}
