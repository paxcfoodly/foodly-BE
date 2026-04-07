import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as routingService from '../services/routingService';

// ─── List Routings by Item ───

export async function listRoutingsByItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemCd = req.query.item_cd as string;
    if (!itemCd) {
      res.status(400).json(errorResponse('item_cd 쿼리 파라미터는 필수입니다.'));
      return;
    }
    const routings = await routingService.listRoutingsByItem(itemCd);
    res.json(successResponse(routings));
  } catch (err) {
    next(err);
  }
}

// ─── Bulk Set Routings ───

export async function bulkSetRoutingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, routings } = req.body;

    if (!item_cd) {
      res.status(400).json(errorResponse('item_cd는 필수 항목입니다.'));
      return;
    }
    if (!Array.isArray(routings)) {
      res.status(400).json(errorResponse('routings는 배열이어야 합니다.'));
      return;
    }

    const result = await routingService.bulkSetRoutings(item_cd, routings, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Create Routing ───

export async function createRoutingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, process_cd, seq_no, std_time, setup_time, use_yn } = req.body;

    if (!item_cd || !process_cd || seq_no == null) {
      res.status(400).json(errorResponse('item_cd, process_cd, seq_no는 필수 항목입니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const routing = await routingService.createRouting(
      {
        item_cd,
        process_cd,
        seq_no: Number(seq_no),
        std_time: std_time != null ? Number(std_time) : null,
        setup_time: setup_time != null ? Number(setup_time) : null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(routing));
  } catch (err) {
    next(err);
  }
}

// ─── Update Routing ───

export async function updateRoutingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const routingId = Number(req.params.routingId);
    if (isNaN(routingId)) {
      res.status(400).json(errorResponse('유효하지 않은 routingId입니다.'));
      return;
    }

    const { process_cd, seq_no, std_time, setup_time, use_yn } = req.body;

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const routing = await routingService.updateRouting(
      routingId,
      {
        process_cd,
        seq_no: seq_no !== undefined ? Number(seq_no) : undefined,
        std_time: std_time !== undefined ? Number(std_time) : undefined,
        setup_time: setup_time !== undefined ? Number(setup_time) : undefined,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(routing));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Routing ───

export async function deleteRoutingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const routingId = Number(req.params.routingId);
    if (isNaN(routingId)) {
      res.status(400).json(errorResponse('유효하지 않은 routingId입니다.'));
      return;
    }

    const result = await routingService.deleteRouting(routingId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
