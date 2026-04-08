import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as defectService from '../services/defectService';
import * as defectDisposeService from '../services/defectDisposeService';

// ─── List Defects (paginated) ───

export async function listDefectsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await defectService.listDefects(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Defect by ID ───

export async function getDefectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defectId = parseInt(req.params.defectId as string, 10);
    if (isNaN(defectId)) {
      res.status(400).json(errorResponse('유효하지 않은 불량 ID입니다.'));
      return;
    }
    const defect = await defectService.getDefectById(defectId);
    res.json(successResponse(defect));
  } catch (err) {
    next(err);
  }
}

// ─── Create Defect ───

export async function createDefectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wo_id, item_cd, lot_no, defect_type_cd, defect_cause_cd, defect_qty, process_cd, remark, file_id } = req.body;

    if (!item_cd) {
      res.status(400).json(errorResponse('item_cd는 필수 항목입니다.'));
      return;
    }
    if (!defect_type_cd) {
      res.status(400).json(errorResponse('defect_type_cd는 필수 항목입니다.'));
      return;
    }
    if (defect_qty == null) {
      res.status(400).json(errorResponse('defect_qty는 필수 항목입니다.'));
      return;
    }

    const defect = await defectService.createDefect(
      {
        wo_id: wo_id != null ? Number(wo_id) : null,
        item_cd,
        lot_no: lot_no ?? null,
        defect_type_cd,
        defect_cause_cd: defect_cause_cd ?? null,
        defect_qty: Number(defect_qty),
        process_cd: process_cd ?? null,
        remark: remark ?? null,
        file_id: file_id != null ? Number(file_id) : null,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(defect));
  } catch (err) {
    next(err);
  }
}

// ─── Update Defect ───

export async function updateDefectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defectId = parseInt(req.params.defectId as string, 10);
    if (isNaN(defectId)) {
      res.status(400).json(errorResponse('유효하지 않은 불량 ID입니다.'));
      return;
    }

    const { wo_id, item_cd, lot_no, defect_type_cd, defect_cause_cd, defect_qty, process_cd, remark, file_id } = req.body;

    const defect = await defectService.updateDefect(
      defectId,
      {
        wo_id: wo_id != null ? Number(wo_id) : undefined,
        item_cd,
        lot_no: lot_no ?? undefined,
        defect_type_cd,
        defect_cause_cd: defect_cause_cd ?? undefined,
        defect_qty: defect_qty != null ? Number(defect_qty) : undefined,
        process_cd: process_cd ?? undefined,
        remark: remark ?? undefined,
        file_id: file_id != null ? Number(file_id) : undefined,
      },
      req.user?.loginId,
    );
    res.json(successResponse(defect));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Defect ───

export async function deleteDefectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defectId = parseInt(req.params.defectId as string, 10);
    if (isNaN(defectId)) {
      res.status(400).json(errorResponse('유효하지 않은 불량 ID입니다.'));
      return;
    }
    const result = await defectService.deleteDefect(defectId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── List Disposals ───

export async function listDisposalsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defectId = parseInt(req.params.defectId as string, 10);
    if (isNaN(defectId)) {
      res.status(400).json(errorResponse('유효하지 않은 불량 ID입니다.'));
      return;
    }
    const disposals = await defectDisposeService.listDisposals(defectId);
    res.json(successResponse(disposals));
  } catch (err) {
    next(err);
  }
}

// ─── Create Disposal ───

export async function createDisposalHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defectId = parseInt(req.params.defectId as string, 10);
    if (isNaN(defectId)) {
      res.status(400).json(errorResponse('유효하지 않은 불량 ID입니다.'));
      return;
    }

    const { dispose_type, dispose_qty, approve_by, remark } = req.body;

    if (!dispose_type) {
      res.status(400).json(errorResponse('dispose_type은 필수 항목입니다.'));
      return;
    }
    if (dispose_qty == null) {
      res.status(400).json(errorResponse('dispose_qty는 필수 항목입니다.'));
      return;
    }

    const result = await defectDisposeService.createDisposal(
      defectId,
      {
        dispose_type,
        dispose_qty: Number(dispose_qty),
        approve_by: approve_by ?? null,
        remark: remark ?? null,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
