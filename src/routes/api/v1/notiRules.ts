import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listNotiRulesHandler,
  createNotiRuleHandler,
  updateNotiRuleHandler,
  deleteNotiRuleHandler,
} from '../../../controllers/notiRuleController';

const notiRulesRouter = Router();

// All routes require authentication
notiRulesRouter.use(authenticate);
notiRulesRouter.use(requirePermission({ menuUrl: '/system/notification' }));

// List noti rules
notiRulesRouter.get('/', listNotiRulesHandler);

// Create noti rule
notiRulesRouter.post('/', createNotiRuleHandler);

// Update noti rule
notiRulesRouter.put('/:ruleId', updateNotiRuleHandler);

// Delete noti rule
notiRulesRouter.delete('/:ruleId', deleteNotiRuleHandler);

export default notiRulesRouter;
