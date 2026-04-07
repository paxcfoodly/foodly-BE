import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as itemService from '../services/itemService';

const VALID_ITEM_TYPES = ['RAW', 'SEMI', 'FIN'];

// ─── List Items (paginated) ───

export async function listItemsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await itemService.listItems(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Item by ID ───

export async function getItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemCd = req.params.itemCd as string;
    const item = await itemService.getItemById(itemCd);
    res.json(successResponse(item));
  } catch (err) {
    next(err);
  }
}

// ─── Create Item ───

export async function createItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { item_cd, item_nm, item_type, unit_cd, spec, drawing_no, safety_stock, use_yn } = req.body;

    // Required field validation
    if (!item_cd || !item_nm || !item_type) {
      res.status(400).json(errorResponse('item_cd, item_nm, item_type은 필수 항목입니다.'));
      return;
    }

    // item_type validation
    if (!VALID_ITEM_TYPES.includes(item_type)) {
      res.status(400).json(errorResponse('item_type은 RAW, SEMI, FIN 중 하나여야 합니다.'));
      return;
    }

    // use_yn validation
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const item = await itemService.createItem(
      { item_cd, item_nm, item_type, unit_cd, spec, drawing_no, safety_stock: safety_stock != null ? Number(safety_stock) : null, use_yn },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(item));
  } catch (err) {
    next(err);
  }
}

// ─── Update Item ───

export async function updateItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemCd = req.params.itemCd as string;
    const { item_nm, item_type, unit_cd, spec, drawing_no, safety_stock, use_yn } = req.body;

    // item_type validation
    if (item_type !== undefined && !VALID_ITEM_TYPES.includes(item_type)) {
      res.status(400).json(errorResponse('item_type은 RAW, SEMI, FIN 중 하나여야 합니다.'));
      return;
    }

    // use_yn validation
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const item = await itemService.updateItem(
      itemCd,
      { item_nm, item_type, unit_cd, spec, drawing_no, safety_stock: safety_stock !== undefined ? Number(safety_stock) : undefined, use_yn },
      req.user?.loginId,
    );
    res.json(successResponse(item));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Item ───

export async function deleteItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemCd = req.params.itemCd as string;
    const result = await itemService.deleteItem(itemCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Import Items (Excel) ───

export async function importItemsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('엑셀 파일을 업로드해주세요.'));
      return;
    }
    const result = await itemService.bulkImportItems(req.file.buffer, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Export Items (Excel) ───

export async function exportItemsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await itemService.exportItems(req, res);
  } catch (err) {
    next(err);
  }
}
