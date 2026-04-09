import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as settingService from '../services/settingService';

// ─── Company ───

export async function getCompanyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await settingService.getCompany();
    res.json(successResponse(company));
  } catch (err) {
    next(err);
  }
}

export async function updateCompanyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { company_cd, company_nm, biz_no, ceo_nm, address, tel, fax } = req.body;
    if (!company_cd) {
      res.status(400).json(errorResponse('company_cd는 필수 항목입니다.'));
      return;
    }
    const company = await settingService.updateCompany(
      { company_cd, company_nm, biz_no, ceo_nm, address, tel, fax },
      req.user?.loginId,
    );
    res.json(successResponse(company));
  } catch (err) {
    next(err);
  }
}

// ─── Numberings ───

export async function listNumberingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const numberings = await settingService.listNumberings();
    res.json(successResponse(numberings));
  } catch (err) {
    next(err);
  }
}

export async function updateNumberingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const numType = req.params.numType as string;
    if (!numType) {
      res.status(400).json(errorResponse('numType은 필수 항목입니다.'));
      return;
    }
    const { prefix, seq_length } = req.body;
    const numbering = await settingService.updateNumbering(
      numType,
      { prefix, seq_length: seq_length !== undefined ? Number(seq_length) : undefined },
      req.user?.loginId,
    );
    res.json(successResponse(numbering));
  } catch (err) {
    next(err);
  }
}

// ─── System Settings ───

export async function getSettingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = req.query.group as string | undefined;
    const settings = await settingService.getSettings(group);
    res.json(successResponse(settings));
  } catch (err) {
    next(err);
  }
}

export async function batchUpsertSettingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      res.status(400).json(errorResponse('settings는 배열이어야 합니다.'));
      return;
    }
    const result = await settingService.batchUpsertSettings(settings, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
