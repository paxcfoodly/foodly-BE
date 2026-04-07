import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { successResponse } from '../types/apiResponse';
import { AppError } from '../middlewares/errorHandler';
import { saveFileMetadata, saveFilesMetadata, getFileForDownload } from '../services/fileService';

/**
 * POST /api/v1/files/upload
 * Handles single file (field: file) or multiple files (field: files, max 10).
 */
export async function uploadFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refTable = req.body?.ref_table as string | undefined;
    const refId = req.body?.ref_id as string | undefined;
    const createBy = (req as any).user?.userId ?? req.body?.create_by ?? null;

    // multer populates req.file (single) or req.files (array)
    const files = req.files
      ? (req.files as Express.Multer.File[])
      : req.file
        ? [req.file]
        : [];

    if (files.length === 0) {
      throw new AppError('업로드할 파일이 없습니다.', 400);
    }

    const results = files.length === 1
      ? [await saveFileMetadata(files[0], { refTable, refId, createBy })]
      : await saveFilesMetadata(files, { refTable, refId, createBy });

    res.status(201).json(successResponse(results));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/:fileId
 * Download a file by its DB ID.
 */
export async function downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fileId = Number(req.params.fileId);
    if (isNaN(fileId)) {
      throw new AppError('유효하지 않은 파일 ID입니다.', 400);
    }

    const { metadata, absolutePath } = await getFileForDownload(fileId);

    // Determine content disposition
    const ext = path.extname(metadata.original_nm).toLowerCase();
    const encodedName = encodeURIComponent(metadata.original_nm);

    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    res.sendFile(absolutePath);
  } catch (err) {
    next(err);
  }
}
