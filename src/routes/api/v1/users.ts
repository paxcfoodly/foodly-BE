import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requireRole } from '../../../middlewares/permission';
import {
  createUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
  resetPasswordHandler,
} from '../../../controllers/userController';

const usersRouter = Router();

// All user management routes require authentication + SYS_ADMIN role
usersRouter.use(authenticate);
usersRouter.use(requireRole('SYS_ADMIN'));

/**
 * @openapi
 * tags:
 *   - name: 사용자관리
 *     description: 시스템 사용자 CRUD 및 비밀번호 초기화
 */

usersRouter.post('/', createUserHandler);
usersRouter.get('/', listUsersHandler);
usersRouter.get('/:id', getUserHandler);
usersRouter.put('/:id', updateUserHandler);
usersRouter.delete('/:id', deleteUserHandler);
usersRouter.post('/:id/reset-password', resetPasswordHandler);

export default usersRouter;
