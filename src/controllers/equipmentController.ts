import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as equipmentService from '../services/equipmentService';

const VALID_EQUIP_TYPES = ['CNC', 'PRESS', 'INJECTION', 'PACKAGING'];

// ─── List Equipments (paginated) ───

export async function listEquipmentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await equipmentService.listEquipments(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Equipment by ID ───

export async function getEquipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const equipCd = req.params.equipCd as string;
    const equipment = await equipmentService.getEquipmentById(equipCd);
    res.json(successResponse(equipment));
  } catch (err) {
    next(err);
  }
}

// ─── Create Equipment ───

export async function createEquipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { equip_cd, equip_nm, equip_type, maker, model_nm, install_date, workshop_cd, use_yn } = req.body;

    if (!equip_cd || !equip_nm) {
      res.status(400).json(errorResponse('equip_cd, equip_nm은 필수 항목입니다.'));
      return;
    }

    if (equip_type !== undefined && equip_type !== null && !VALID_EQUIP_TYPES.includes(equip_type)) {
      res.status(400).json(errorResponse('equip_type은 CNC, PRESS, INJECTION, PACKAGING 중 하나여야 합니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const equipment = await equipmentService.createEquipment(
      {
        equip_cd,
        equip_nm,
        equip_type: equip_type ?? null,
        maker: maker ?? null,
        model_nm: model_nm ?? null,
        install_date: install_date ?? null,
        workshop_cd: workshop_cd ?? null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(equipment));
  } catch (err) {
    next(err);
  }
}

// ─── Update Equipment ───

export async function updateEquipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const equipCd = req.params.equipCd as string;
    const { equip_nm, equip_type, maker, model_nm, install_date, workshop_cd, use_yn } = req.body;

    if (equip_type !== undefined && equip_type !== null && !VALID_EQUIP_TYPES.includes(equip_type)) {
      res.status(400).json(errorResponse('equip_type은 CNC, PRESS, INJECTION, PACKAGING 중 하나여야 합니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const equipment = await equipmentService.updateEquipment(
      equipCd,
      {
        equip_nm,
        equip_type,
        maker,
        model_nm,
        install_date,
        workshop_cd,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(equipment));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Equipment ───

export async function deleteEquipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const equipCd = req.params.equipCd as string;
    const result = await equipmentService.deleteEquipment(equipCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Import Equipments (Excel) ───

export async function importEquipmentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('엑셀 파일을 업로드해주세요.'));
      return;
    }
    const result = await equipmentService.bulkImportEquipments(req.file.buffer, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Export Equipments (Excel) ───

export async function exportEquipmentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await equipmentService.exportEquipments(req, res);
  } catch (err) {
    next(err);
  }
}
