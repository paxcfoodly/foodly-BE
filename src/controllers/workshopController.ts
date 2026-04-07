import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as workshopService from '../services/workshopService';

// ─── List Workshops (paginated) ───

export async function listWorkshopsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await workshopService.listWorkshops(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Workshop by ID ───

export async function getWorkshopHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workshopCd = req.params.workshopCd as string;
    const workshop = await workshopService.getWorkshopById(workshopCd);
    res.json(successResponse(workshop));
  } catch (err) {
    next(err);
  }
}

// ─── Create Workshop ───

export async function createWorkshopHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workshop_cd, workshop_nm, plant_cd, parent_cd, workshop_type, sort_order, use_yn } = req.body;

    if (!workshop_cd || !workshop_nm || !plant_cd) {
      res.status(400).json(errorResponse('workshop_cd, workshop_nm, plant_cd는 필수 항목입니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const workshop = await workshopService.createWorkshop(
      {
        workshop_cd,
        workshop_nm,
        plant_cd,
        parent_cd: parent_cd ?? null,
        workshop_type: workshop_type ?? null,
        sort_order: sort_order != null ? Number(sort_order) : undefined,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(workshop));
  } catch (err) {
    next(err);
  }
}

// ─── Update Workshop ───

export async function updateWorkshopHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workshopCd = req.params.workshopCd as string;
    const { workshop_nm, plant_cd, parent_cd, workshop_type, sort_order, use_yn } = req.body;

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const workshop = await workshopService.updateWorkshop(
      workshopCd,
      {
        workshop_nm,
        plant_cd,
        parent_cd,
        workshop_type,
        sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(workshop));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Workshop ───

export async function deleteWorkshopHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workshopCd = req.params.workshopCd as string;
    const result = await workshopService.deleteWorkshop(workshopCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Import Workshops (Excel) ───

export async function importWorkshopsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('엑셀 파일을 업로드해주세요.'));
      return;
    }
    const result = await workshopService.bulkImportWorkshops(req.file.buffer, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Export Workshops (Excel) ───

export async function exportWorkshopsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await workshopService.exportWorkshops(req, res);
  } catch (err) {
    next(err);
  }
}
