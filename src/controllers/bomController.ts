import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as bomService from '../services/bomService';

// ─── List BOMs (paginated) ───

export async function listBomsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bomService.listBoms(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get BOM by ID ───

export async function getBomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bomId = parseInt(req.params.bomId as string, 10);
    if (isNaN(bomId)) {
      res.status(400).json(errorResponse('bomId는 숫자여야 합니다.'));
      return;
    }
    const bom = await bomService.getBomById(bomId);
    res.json(successResponse(bom));
  } catch (err) {
    next(err);
  }
}

// ─── Create BOM ───

export async function createBomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { parent_item_cd, child_item_cd, level_no, qty, loss_rate, alt_item_cd, process_cd, use_yn } = req.body;

    // Required field validation
    if (!parent_item_cd || !child_item_cd || qty === undefined || qty === null) {
      res.status(400).json(errorResponse('parent_item_cd, child_item_cd, qty는 필수 항목입니다.'));
      return;
    }

    // qty must be positive
    if (Number(qty) <= 0) {
      res.status(400).json(errorResponse('소요량(qty)은 0보다 커야 합니다.'));
      return;
    }

    // use_yn validation
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    // loss_rate range validation
    if (loss_rate !== undefined && loss_rate !== null) {
      const lr = Number(loss_rate);
      if (isNaN(lr) || lr < 0 || lr > 100) {
        res.status(400).json(errorResponse('손실률(loss_rate)은 0~100 사이여야 합니다.'));
        return;
      }
    }

    const bom = await bomService.createBom(
      {
        parent_item_cd,
        child_item_cd,
        level_no: level_no != null ? Number(level_no) : undefined,
        qty: Number(qty),
        loss_rate: loss_rate != null ? Number(loss_rate) : null,
        alt_item_cd: alt_item_cd ?? null,
        process_cd: process_cd ?? null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(bom));
  } catch (err) {
    next(err);
  }
}

// ─── Update BOM ───

export async function updateBomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bomId = parseInt(req.params.bomId as string, 10);
    if (isNaN(bomId)) {
      res.status(400).json(errorResponse('bomId는 숫자여야 합니다.'));
      return;
    }

    const { parent_item_cd, child_item_cd, level_no, qty, loss_rate, alt_item_cd, process_cd, use_yn } = req.body;

    // qty validation if provided
    if (qty !== undefined && Number(qty) <= 0) {
      res.status(400).json(errorResponse('소요량(qty)은 0보다 커야 합니다.'));
      return;
    }

    // use_yn validation
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    // loss_rate range validation
    if (loss_rate !== undefined && loss_rate !== null) {
      const lr = Number(loss_rate);
      if (isNaN(lr) || lr < 0 || lr > 100) {
        res.status(400).json(errorResponse('손실률(loss_rate)은 0~100 사이여야 합니다.'));
        return;
      }
    }

    const bom = await bomService.updateBom(
      bomId,
      {
        parent_item_cd,
        child_item_cd,
        level_no: level_no !== undefined ? Number(level_no) : undefined,
        qty: qty !== undefined ? Number(qty) : undefined,
        loss_rate: loss_rate !== undefined ? (loss_rate != null ? Number(loss_rate) : null) : undefined,
        alt_item_cd,
        process_cd,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(bom));
  } catch (err) {
    next(err);
  }
}

// ─── Delete BOM ───

export async function deleteBomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bomId = parseInt(req.params.bomId as string, 10);
    if (isNaN(bomId)) {
      res.status(400).json(errorResponse('bomId는 숫자여야 합니다.'));
      return;
    }
    const result = await bomService.deleteBom(bomId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Forward Tree (정전개) ───

export async function getForwardTreeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parentItemCd = req.params.parentItemCd as string;
    if (!parentItemCd) {
      res.status(400).json(errorResponse('parentItemCd는 필수 항목입니다.'));
      return;
    }
    const tree = await bomService.getForwardTree(parentItemCd);
    res.json(successResponse(tree));
  } catch (err) {
    next(err);
  }
}

// ─── Reverse Tree (역전개) ───

export async function getReverseTreeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const childItemCd = req.params.childItemCd as string;
    if (!childItemCd) {
      res.status(400).json(errorResponse('childItemCd는 필수 항목입니다.'));
      return;
    }
    const tree = await bomService.getReverseTree(childItemCd);
    res.json(successResponse(tree));
  } catch (err) {
    next(err);
  }
}

// ─── Import BOMs (Excel) ───

export async function importBomsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('엑셀 파일을 업로드해주세요.'));
      return;
    }
    const result = await bomService.importBoms(req.file.buffer, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Export BOMs (Excel) ───

export async function exportBomsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await bomService.exportBoms(req, res);
  } catch (err) {
    next(err);
  }
}
