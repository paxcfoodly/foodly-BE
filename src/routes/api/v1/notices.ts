import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requireRole } from '../../../middlewares/permission';
import {
  listNoticesHandler,
  getNoticeHandler,
  getPopupNoticesHandler,
  createNoticeHandler,
  updateNoticeHandler,
  deleteNoticeHandler,
} from '../../../controllers/noticeController';

const noticesRouter = Router();

// 조회 — 모든 인증 사용자 (회사 공지, 테넌트 확장이 격리). MES_USER 포함.
noticesRouter.use(authenticate);
noticesRouter.get('/popup', getPopupNoticesHandler);
noticesRouter.get('/', listNoticesHandler);
noticesRouter.get('/:id', getNoticeHandler);

// 생성/수정/삭제 — SYS_ADMIN 전용
noticesRouter.post('/', requireRole('SYS_ADMIN'), createNoticeHandler);
noticesRouter.put('/:id', requireRole('SYS_ADMIN'), updateNoticeHandler);
noticesRouter.delete('/:id', requireRole('SYS_ADMIN'), deleteNoticeHandler);

export default noticesRouter;
