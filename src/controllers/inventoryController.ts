import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as inventoryService from '../services/inventoryService';

// ─── List Inventory (paginated) ───

export async function listInventoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inventoryService.listInventory(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Adjust Inventory ───

export async function adjustInventoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, lot_no, wh_cd, adjust_qty, adjust_reason } = req.body;

    if (!item_cd || !wh_cd || adjust_qty == null) {
      res.status(400).json(errorResponse('item_cd, wh_cd, adjust_qty는 필수 항목입니다.'));
      return;
    }

    const result = await inventoryService.adjustInventory(
      {
        item_cd,
        lot_no: lot_no ?? null,
        wh_cd,
        adjust_qty: Number(adjust_qty),
        adjust_reason: adjust_reason ?? undefined,
      },
      req.user?.loginId,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
