import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as processService from '../services/processService';

const VALID_PROCESS_TYPES = ['MACHINING', 'ASSY', 'INSP', 'PKG'];

// ─── List Processes (paginated) ───

export async function listProcessesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await processService.listProcesses(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Process by ID ───

export async function getProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const process = await processService.getProcessById(processCd);
    res.json(successResponse(process));
  } catch (err) {
    next(err);
  }
}

// ─── Create Process ───

export async function createProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { process_cd, process_nm, process_type, std_time, workshop_cd, use_yn } = req.body;

    if (!process_cd || !process_nm) {
      res.status(400).json(errorResponse('process_cd, process_nm은 필수 항목입니다.'));
      return;
    }

    if (process_type !== undefined && process_type !== null && !VALID_PROCESS_TYPES.includes(process_type)) {
      res.status(400).json(errorResponse('process_type은 MACHINING, ASSY, INSP, PKG 중 하나여야 합니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const process = await processService.createProcess(
      {
        process_cd,
        process_nm,
        process_type: process_type ?? null,
        std_time: std_time != null ? Number(std_time) : null,
        workshop_cd: workshop_cd ?? null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(process));
  } catch (err) {
    next(err);
  }
}

// ─── Update Process ───

export async function updateProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const { process_nm, process_type, std_time, workshop_cd, use_yn } = req.body;

    if (process_type !== undefined && process_type !== null && !VALID_PROCESS_TYPES.includes(process_type)) {
      res.status(400).json(errorResponse('process_type은 MACHINING, ASSY, INSP, PKG 중 하나여야 합니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const process = await processService.updateProcess(
      processCd,
      {
        process_nm,
        process_type,
        std_time: std_time !== undefined ? Number(std_time) : undefined,
        workshop_cd,
        use_yn,
      },
      req.user?.loginId,
    );
    res.json(successResponse(process));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Process ───

export async function deleteProcessHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const processCd = req.params.processCd as string;
    const result = await processService.deleteProcess(processCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Import Processes (Excel) ───

export async function importProcessesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('엑셀 파일을 업로드해주세요.'));
      return;
    }
    const result = await processService.bulkImportProcesses(req.file.buffer, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Export Processes (Excel) ───

export async function exportProcessesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await processService.exportProcesses(req, res);
  } catch (err) {
    next(err);
  }
}
