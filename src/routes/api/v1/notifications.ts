import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import {
  listMyNotificationsHandler,
  unreadCountHandler,
  markReadHandler,
  markAllReadHandler,
} from '../../../controllers/notificationController';

const notificationsRouter = Router();

// 모든 인증 사용자의 개인 알림함 (테넌트 확장이 회사 격리)
notificationsRouter.use(authenticate);

notificationsRouter.get('/', listMyNotificationsHandler);
notificationsRouter.get('/unread-count', unreadCountHandler);
notificationsRouter.patch('/read-all', markAllReadHandler);
notificationsRouter.patch('/:id/read', markReadHandler);

export default notificationsRouter;
