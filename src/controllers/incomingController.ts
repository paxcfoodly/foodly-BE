import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as incomingService from '../services/incomingService';

// ─── List Incomings (paginated) ───

export async function listIncomingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await incomingService.listIncomings(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Incoming by ID ───

export async function getIncomingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incomingId = parseInt(req.params.incomingId as string, 10);
    if (isNaN(incomingId)) {
      res.status(400).json(errorResponse('유효하지 않은 입고 ID입니다.'));
      return;
    }
    const incoming = await incomingService.getIncomingById(incomingId);
    res.json(successResponse(incoming));
  } catch (err) {
    next(err);
  }
}

// ─── Create Incoming ───

export async function createIncomingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cust_cd, details } = req.body;

    if (!cust_cd) {
      res.status(400).json(errorResponse('cust_cd는 필수 항목입니다.'));
      return;
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      res.status(400).json(errorResponse('details 배열은 필수 항목입니다.'));
      return;
    }

    const incoming = await incomingService.createIncoming(
      {
        cust_cd,
        details: details.map((d: any) => ({
          item_cd: d.item_cd,
          lot_no: d.lot_no ?? null,
          incoming_qty: Number(d.incoming_qty),
        })),
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(incoming));
  } catch (err) {
    next(err);
  }
}

// ─── Update Incoming ───

export async function updateIncomingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incomingId = parseInt(req.params.incomingId as string, 10);
    if (isNaN(incomingId)) {
      res.status(400).json(errorResponse('유효하지 않은 입고 ID입니다.'));
      return;
    }

    const { cust_cd, details } = req.body;
    const incoming = await incomingService.updateIncoming(
      incomingId,
      {
        cust_cd,
        details: details
          ? details.map((d: any) => ({
              item_cd: d.item_cd,
              lot_no: d.lot_no ?? null,
              incoming_qty: Number(d.incoming_qty),
            }))
          : undefined,
      },
      req.user?.loginId,
    );
    res.json(successResponse(incoming));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Incoming ───

export async function deleteIncomingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incomingId = parseInt(req.params.incomingId as string, 10);
    if (isNaN(incomingId)) {
      res.status(400).json(errorResponse('유효하지 않은 입고 ID입니다.'));
      return;
    }
    const result = await incomingService.deleteIncoming(incomingId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Confirm Incoming (PLAN → CONFIRMED) ───

export async function confirmIncomingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incomingId = parseInt(req.params.incomingId as string, 10);
    if (isNaN(incomingId)) {
      res.status(400).json(errorResponse('유효하지 않은 입고 ID입니다.'));
      return;
    }

    const { wh_cd } = req.body;
    const incoming = await incomingService.confirmIncoming(
      incomingId,
      { wh_cd: wh_cd || 'WH-MAIN' },
      req.user?.loginId,
    );
    res.json(successResponse(incoming));
  } catch (err) {
    next(err);
  }
}
