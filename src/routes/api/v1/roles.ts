import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requireRole } from '../../../middlewares/permission';
import {
  listRolesHandler,
  getRoleHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
  setPermissionsHandler,
} from '../../../controllers/roleController';

const rolesRouter = Router();

rolesRouter.use(authenticate);
rolesRouter.use(requireRole('SYS_ADMIN'));

rolesRouter.get('/', listRolesHandler);
rolesRouter.get('/:roleCd', getRoleHandler);
rolesRouter.post('/', createRoleHandler);
rolesRouter.put('/:roleCd', updateRoleHandler);
rolesRouter.delete('/:roleCd', deleteRoleHandler);
rolesRouter.put('/:roleCd/permissions', setPermissionsHandler);

export default rolesRouter;
