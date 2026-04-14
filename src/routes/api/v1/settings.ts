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
settingsRouter.get('/company', requirePermission({ menuUrl: '/system/settings' }), getCompanyHandler);
settingsRouter.put('/company', requirePermission({ menuUrl: '/system/settings' }), updateCompanyHandler);

// ─── Numbering Rules ───
settingsRouter.get('/numberings', requirePermission({ menuUrl: '/system/settings' }), listNumberingsHandler);
settingsRouter.put('/numberings/:numType', requirePermission({ menuUrl: '/system/settings' }), updateNumberingHandler);

// ─── System Settings (key-value) ───
settingsRouter.get('/', requirePermission({ menuUrl: '/system/settings' }), getSettingsHandler);
settingsRouter.patch('/', requirePermission({ menuUrl: '/system/settings' }), batchUpsertSettingsHandler);

export default settingsRouter;
