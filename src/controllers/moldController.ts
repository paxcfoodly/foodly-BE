import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as moldService from '../services/moldService';

// ─── List Molds (paginated) ───

export async function listMoldsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await moldService.listMolds(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Mold by ID ───

export async function getMoldHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const moldCd = req.params.moldCd as string;
    const mold = await moldService.getMoldById(moldCd);
    res.json(successResponse(mold));
  } catch (err) {
    next(err);
  }
}

// ─── Create Mold ───

export async function createMoldHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mold_cd, mold_nm, item_cd, warranty_shots, current_shots, use_yn } = req.body;

    if (!mold_cd || !mold_nm) {
      res.status(400).json(errorResponse('mold_cd, mold_nm은 필수 항목입니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const mold = await moldService.createMold(
      {
        mold_cd,
        mold_nm,
        item_cd: item_cd ?? null,
        warranty_shots: warranty_shots != null ? Number(warranty_shots) : null,
        current_shots: current_shots != null ? Number(current_shots) : undefined,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(mold));
  } catch (err) {
    next(err);
  }
}

// ─── Update Mold ───

export async function updateMoldHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const moldCd = req.params.moldCd as string;
    const { mold_nm, item_cd, warranty_shots, current_shots, use_yn } = req.body;

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const mold = await moldService.updateMold(
      moldCd,
      {
        mold_nm,
        item_cd,
        warranty_shots: warranty_shots !== undefined ? Number(warranty_shots) : undefined,
        current_shots: current_shots !== undefined ? Number(current_shots) : undefined,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(mold));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Mold ───

export async function deleteMoldHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const moldCd = req.params.moldCd as string;
    const result = await moldService.deleteMold(moldCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Import Molds (Excel) ───

export async function importMoldsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('엑셀 파일을 업로드해주세요.'));
      return;
    }
    const result = await moldService.bulkImportMolds(req.file.buffer, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Export Molds (Excel) ───

export async function exportMoldsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await moldService.exportMolds(req, res);
  } catch (err) {
    next(err);
  }
}
