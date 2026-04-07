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

// Popup notices — accessible to all authenticated users
noticesRouter.get('/popup', authenticate, getPopupNoticesHandler);

// All other notice management routes require SYS_ADMIN
noticesRouter.use(authenticate);
noticesRouter.use(requireRole('SYS_ADMIN'));

noticesRouter.get('/', listNoticesHandler);
noticesRouter.get('/:id', getNoticeHandler);
noticesRouter.post('/', createNoticeHandler);
noticesRouter.put('/:id', updateNoticeHandler);
noticesRouter.delete('/:id', deleteNoticeHandler);

export default noticesRouter;
