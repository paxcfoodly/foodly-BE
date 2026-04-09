import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as lotService from '../services/lotService';

// ─── List LOTs (paginated) ───

export async function listLotsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await lotService.listLots(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get LOT by lot_no ───

export async function getLotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotNo = req.params.lotNo as string;
    if (!lotNo) {
      res.status(400).json(errorResponse('LOT 번호가 필요합니다.'));
      return;
    }
    const result = await lotService.getLotById(lotNo);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Forward Trace ───

export async function forwardTraceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotNo = req.params.lotNo as string;
    if (!lotNo) {
      res.status(400).json(errorResponse('LOT 번호가 필요합니다.'));
      return;
    }
    const result = await lotService.forwardTrace(lotNo);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Backward Trace ───

export async function backwardTraceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotNo = req.params.lotNo as string;
    if (!lotNo) {
      res.status(400).json(errorResponse('LOT 번호가 필요합니다.'));
      return;
    }
    const result = await lotService.backwardTrace(lotNo);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Split LOT ───

export async function splitLotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotNo = req.params.lotNo as string;
    if (!lotNo) {
      res.status(400).json(errorResponse('LOT 번호가 필요합니다.'));
      return;
    }

    const { children } = req.body;
    if (!children || !Array.isArray(children)) {
      res.status(400).json(errorResponse('children 배열이 필요합니다.'));
      return;
    }

    const result = await lotService.splitLot(
      lotNo,
      { children: children.map((c: any) => ({ qty: Number(c.qty) })) },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Merge LOTs ───

export async function mergeLotsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { source_lot_nos } = req.body;
    if (!source_lot_nos || !Array.isArray(source_lot_nos)) {
      res.status(400).json(errorResponse('source_lot_nos 배열이 필요합니다.'));
      return;
    }

    const result = await lotService.mergeLots(
      { source_lot_nos },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Update LOT Status ───

export async function updateLotStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotNo = req.params.lotNo as string;
    if (!lotNo) {
      res.status(400).json(errorResponse('LOT 번호가 필요합니다.'));
      return;
    }

    const { lot_status } = req.body;
    if (!lot_status) {
      res.status(400).json(errorResponse('lot_status가 필요합니다.'));
      return;
    }

    const result = await lotService.updateLotStatus(lotNo, lot_status, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
