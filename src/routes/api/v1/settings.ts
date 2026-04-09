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
settingsRouter.get('/company', requirePermission({ menuUrl: '/settings/system' }), getCompanyHandler);
settingsRouter.put('/company', requirePermission({ menuUrl: '/settings/system' }), updateCompanyHandler);

// ─── Numbering Rules ───
settingsRouter.get('/numberings', requirePermission({ menuUrl: '/settings/system' }), listNumberingsHandler);
settingsRouter.put('/numberings/:numType', requirePermission({ menuUrl: '/settings/system' }), updateNumberingHandler);

// ─── System Settings (key-value) ───
settingsRouter.get('/', requirePermission({ menuUrl: '/settings/system' }), getSettingsHandler);
settingsRouter.patch('/', requirePermission({ menuUrl: '/settings/system' }), batchUpsertSettingsHandler);

export default settingsRouter;
