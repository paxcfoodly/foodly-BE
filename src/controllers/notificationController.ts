import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';
import { successResponse } from '../types/apiResponse';

/** GET /api/v1/notifications — 내 알림함 */
export async function listMyNotificationsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const list = await notificationService.listMine(req.user!.userId, limit);
    res.json(successResponse(list));
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/notifications/unread-count */
export async function unreadCountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await notificationService.unreadCount(req.user!.userId);
    res.json(successResponse({ count }));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/notifications/:id/read */
export async function markReadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.markRead(Number(req.params.id), req.user!.userId);
    res.json(successResponse({ message: '읽음 처리되었습니다.' }));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/notifications/read-all */
export async function markAllReadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await notificationService.markAllRead(req.user!.userId);
    res.json(successResponse({ count }));
  } catch (err) {
    next(err);
  }
}
