import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  getCompanyHandler,
  updateCompanyHandler,
  listNumberingsHandler,
  updateNumberingHandler,
  getSettingsHandler,
  batchUpsertSettingsHandler,
} from '../../../controllers/settingController';

const settingsRouter = Router();

// All routes require authentication
settingsRouter.use(authenticate);

// ─── Company Info ───
settingsRouter.get('/company', requirePermission({ menuUrl: '/system/config' }), getCompanyHandler);
settingsRouter.put('/company', requirePermission({ menuUrl: '/system/config' }), updateCompanyHandler);

// ─── Numbering Rules ───
settingsRouter.get('/numberings', requirePermission({ menuUrl: '/system/config' }), listNumberingsHandler);
settingsRouter.put('/numberings/:numType', requirePermission({ menuUrl: '/system/config' }), updateNumberingHandler);

// ─── System Settings (key-value) ───
settingsRouter.get('/', requirePermission({ menuUrl: '/system/config' }), getSettingsHandler);
settingsRouter.patch('/', requirePermission({ menuUrl: '/system/config' }), batchUpsertSettingsHandler);

export default settingsRouter;
