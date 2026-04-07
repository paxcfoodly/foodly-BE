import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requireRole } from '../../../middlewares/permission';
import {
  listCodeGroupsAdminHandler,
  getCodeGroupHandler,
  createCodeGroupHandler,
  updateCodeGroupHandler,
  deleteCodeGroupHandler,
  createCodeHandler,
  updateCodeHandler,
  deleteCodeHandler,
} from '../../../controllers/commonCodeAdminController';

const commonCodesAdminRouter = Router();

commonCodesAdminRouter.use(authenticate);
commonCodesAdminRouter.use(requireRole('SYS_ADMIN'));

// Code Group CRUD
commonCodesAdminRouter.get('/', listCodeGroupsAdminHandler);
commonCodesAdminRouter.get('/:groupCd', getCodeGroupHandler);
commonCodesAdminRouter.post('/', createCodeGroupHandler);
commonCodesAdminRouter.put('/:groupCd', updateCodeGroupHandler);
commonCodesAdminRouter.delete('/:groupCd', deleteCodeGroupHandler);

// Code Detail CRUD (nested under group)
commonCodesAdminRouter.post('/:groupCd/codes', createCodeHandler);
commonCodesAdminRouter.put('/:groupCd/codes/:code', updateCodeHandler);
commonCodesAdminRouter.delete('/:groupCd/codes/:code', deleteCodeHandler);

export default commonCodesAdminRouter;
