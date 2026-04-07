import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requireRole } from '../../../middlewares/permission';
import {
  listAuditLogsHandler,
  getAuditLogHandler,
} from '../../../controllers/auditLogController';

const auditLogsRouter = Router();

auditLogsRouter.use(authenticate);
auditLogsRouter.use(requireRole('SYS_ADMIN'));

auditLogsRouter.get('/', listAuditLogsHandler);
auditLogsRouter.get('/:id', getAuditLogHandler);

export default auditLogsRouter;
