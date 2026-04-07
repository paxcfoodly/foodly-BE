import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';
import { parseSort } from '../utils/sorting';
import * as noticeService from '../services/noticeService';

const ALLOWED_SORT_FIELDS = ['notice_id', 'title', 'is_popup', 'create_dt', 'update_dt'];

/**
 * GET /api/v1/notices
 */
export async function listNoticesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req);
    const orderBy = parseSort(req, ALLOWED_SORT_FIELDS);

    const where: Record<string, unknown> = {};

    // Search by title
    const search = req.query.search as string;
    if (search && search.trim()) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // Filter by is_popup
    const isPopup = req.query.is_popup as string;
    if (isPopup && ['Y', 'N'].includes(isPopup)) {
      where.is_popup = isPopup;
    }

    const result = await noticeService.listNotices({
      ...pagination,
      where,
      orderBy,
    });

    const paginated = buildPaginatedResponse(result.notices, result.total, result.page, result.limit);
    res.json(successResponse(paginated.data, paginated.pagination));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notices/popup
 * Public endpoint — returns active popup notices.
 */
export async function getPopupNoticesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notices = await noticeService.getPopupNotices();
    res.json(successResponse(notices));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notices/:id
 */
export async function getNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      res.status(400).json(errorResponse('유효하지 않은 공지사항 ID입니다.'));
      return;
    }
    const notice = await noticeService.getNoticeById(noticeId);
    res.json(successResponse(notice));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/notices
 */
export async function createNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content, is_popup } = req.body;
    if (!title) {
      res.status(400).json(errorResponse('title은 필수 항목입니다.'));
      return;
    }
    if (is_popup !== undefined && !['Y', 'N'].includes(is_popup)) {
      res.status(400).json(errorResponse('is_popup은 Y 또는 N만 가능합니다.'));
      return;
    }
    const notice = await noticeService.createNotice({
      title,
      content,
      is_popup,
      create_by: req.user?.loginId,
    });
    res.status(201).json(successResponse(notice));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/notices/:id
 */
export async function updateNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      res.status(400).json(errorResponse('유효하지 않은 공지사항 ID입니다.'));
      return;
    }
    const { title, content, is_popup } = req.body;
    if (is_popup !== undefined && !['Y', 'N'].includes(is_popup)) {
      res.status(400).json(errorResponse('is_popup은 Y 또는 N만 가능합니다.'));
      return;
    }
    const notice = await noticeService.updateNotice(noticeId, {
      title,
      content,
      is_popup,
      update_by: req.user?.loginId,
    });
    res.json(successResponse(notice));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/notices/:id
 */
export async function deleteNoticeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      res.status(400).json(errorResponse('유효하지 않은 공지사항 ID입니다.'));
      return;
    }
    const result = await noticeService.deleteNotice(noticeId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
