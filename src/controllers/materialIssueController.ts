import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as materialIssueService from '../services/materialIssueService';

// ─── List Material Issues (paginated) ───

export async function listMaterialIssuesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await materialIssueService.listMaterialIssues(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Material Issue by ID ───

export async function getMaterialIssueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issueId = parseInt(req.params.issueId as string, 10);
    if (isNaN(issueId)) {
      res.status(400).json(errorResponse('유효하지 않은 자재불출 ID입니다.'));
      return;
    }
    const issue = await materialIssueService.getMaterialIssueById(issueId);
    res.json(successResponse(issue));
  } catch (err) {
    next(err);
  }
}

// ─── Create Material Issue ───

export async function createMaterialIssueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wo_id, details } = req.body;

    if (!details || !Array.isArray(details) || details.length === 0) {
      res.status(400).json(errorResponse('details 배열은 필수 항목입니다.'));
      return;
    }

    const issue = await materialIssueService.createMaterialIssue(
      {
        wo_id: wo_id != null ? Number(wo_id) : null,
        details: details.map((d: any) => ({
          item_cd: d.item_cd,
          lot_no: d.lot_no ?? null,
          request_qty: Number(d.request_qty),
        })),
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(issue));
  } catch (err) {
    next(err);
  }
}

// ─── Update Material Issue ───

export async function updateMaterialIssueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issueId = parseInt(req.params.issueId as string, 10);
    if (isNaN(issueId)) {
      res.status(400).json(errorResponse('유효하지 않은 자재불출 ID입니다.'));
      return;
    }

    const { wo_id, details } = req.body;
    const issue = await materialIssueService.updateMaterialIssue(
      issueId,
      {
        wo_id: wo_id !== undefined ? (wo_id != null ? Number(wo_id) : null) : undefined,
        details: details
          ? details.map((d: any) => ({
              item_cd: d.item_cd,
              lot_no: d.lot_no ?? null,
              request_qty: Number(d.request_qty),
            }))
          : undefined,
      },
      req.user?.loginId,
    );
    res.json(successResponse(issue));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Material Issue ───

export async function deleteMaterialIssueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issueId = parseInt(req.params.issueId as string, 10);
    if (isNaN(issueId)) {
      res.status(400).json(errorResponse('유효하지 않은 자재불출 ID입니다.'));
      return;
    }
    const result = await materialIssueService.deleteMaterialIssue(issueId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Process Material Issue (REQUESTED → ISSUED) ───

export async function processMaterialIssueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issueId = parseInt(req.params.issueId as string, 10);
    if (isNaN(issueId)) {
      res.status(400).json(errorResponse('유효하지 않은 자재불출 ID입니다.'));
      return;
    }

    const { wh_cd, details } = req.body;
    if (!details || !Array.isArray(details)) {
      res.status(400).json(errorResponse('details 배열은 필수 항목입니다.'));
      return;
    }

    const issue = await materialIssueService.processMaterialIssue(
      issueId,
      {
        wh_cd: wh_cd || 'WH-MAIN',
        details: details.map((d: any) => ({
          issue_dtl_id: Number(d.issue_dtl_id),
          issue_qty: Number(d.issue_qty),
        })),
      },
      req.user?.loginId,
    );
    res.json(successResponse(issue));
  } catch (err) {
    next(err);
  }
}
