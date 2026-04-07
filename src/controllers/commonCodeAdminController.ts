import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as adminService from '../services/commonCodeAdminService';

// ─── Code Group Handlers ───

export async function listCodeGroupsAdminHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await adminService.listCodeGroupsAdmin();
    res.json(successResponse(groups));
  } catch (err) {
    next(err);
  }
}

export async function getCodeGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string;
    const group = await adminService.getCodeGroupById(groupCd);
    res.json(successResponse(group));
  } catch (err) {
    next(err);
  }
}

export async function createCodeGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { group_cd, group_nm } = req.body;
    if (!group_cd || !group_nm) {
      res.status(400).json(errorResponse('group_cd, group_nm은 필수 항목입니다.'));
      return;
    }
    const group = await adminService.createCodeGroup({
      group_cd,
      group_nm,
      create_by: req.user?.loginId,
    });
    res.status(201).json(successResponse(group));
  } catch (err) {
    next(err);
  }
}

export async function updateCodeGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string;
    const { group_nm, use_yn } = req.body;
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }
    const group = await adminService.updateCodeGroup(groupCd, {
      group_nm,
      use_yn,
      update_by: req.user?.loginId,
    });
    res.json(successResponse(group));
  } catch (err) {
    next(err);
  }
}

export async function deleteCodeGroupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string;
    const result = await adminService.deleteCodeGroup(groupCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Code Detail Handlers ───

export async function createCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string;
    const { code, code_nm, sort_order } = req.body;
    if (!code || !code_nm) {
      res.status(400).json(errorResponse('code, code_nm은 필수 항목입니다.'));
      return;
    }
    const created = await adminService.createCode({
      group_cd: groupCd,
      code,
      code_nm,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      create_by: req.user?.loginId,
    });
    res.status(201).json(successResponse(created));
  } catch (err) {
    next(err);
  }
}

export async function updateCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string; const code = req.params.code as string;
    const { code_nm, sort_order, use_yn } = req.body;
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }
    const updated = await adminService.updateCode(groupCd, code, {
      code_nm,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      use_yn,
      update_by: req.user?.loginId,
    });
    res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
}

export async function deleteCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupCd = req.params.groupCd as string; const code = req.params.code as string;
    const result = await adminService.deleteCode(groupCd, code);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
