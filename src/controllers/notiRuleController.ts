import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as notiRuleService from '../services/notiRuleService';

// ─── List Noti Rules ───

export async function listNotiRulesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await notiRuleService.listNotiRules(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Create Noti Rule ───

export async function createNotiRuleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { event_type, target_role_cd, channel, template_id } = req.body;
    if (!event_type) {
      res.status(400).json(errorResponse('event_type은 필수 항목입니다.'));
      return;
    }
    const rule = await notiRuleService.createNotiRule(
      { event_type, target_role_cd, channel, template_id },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(rule));
  } catch (err) {
    next(err);
  }
}

// ─── Update Noti Rule ───

export async function updateNotiRuleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ruleId = parseInt(req.params.ruleId as string, 10);
    if (isNaN(ruleId)) {
      res.status(400).json(errorResponse('유효하지 않은 규칙 ID입니다.'));
      return;
    }
    const { event_type, target_role_cd, channel, template_id, use_yn } = req.body;
    const rule = await notiRuleService.updateNotiRule(
      ruleId,
      { event_type, target_role_cd, channel, template_id, use_yn },
      req.user?.loginId,
    );
    res.json(successResponse(rule));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Noti Rule ───

export async function deleteNotiRuleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ruleId = parseInt(req.params.ruleId as string, 10);
    if (isNaN(ruleId)) {
      res.status(400).json(errorResponse('유효하지 않은 규칙 ID입니다.'));
      return;
    }
    await notiRuleService.deleteNotiRule(ruleId);
    res.json(successResponse(null));
  } catch (err) {
    next(err);
  }
}
