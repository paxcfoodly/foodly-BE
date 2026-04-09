import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listMaterialInputsHandler,
  getMaterialInputHandler,
  createMaterialInputHandler,
  deleteMaterialInputHandler,
} from '../../../controllers/materialInputController';

const materialInputsRouter = Router();

// All routes require authentication + menu-based permission
materialInputsRouter.use(authenticate);
materialInputsRouter.use(requirePermission({ menuUrl: '/result/material' }));

// List material inputs (paginated + filtered + sorted)
materialInputsRouter.get('/', listMaterialInputsHandler);

// Get single material input
materialInputsRouter.get('/:inputId', getMaterialInputHandler);

// Create material input
materialInputsRouter.post('/', createMaterialInputHandler);

// Delete material input
materialInputsRouter.delete('/:inputId', deleteMaterialInputHandler);

export default materialInputsRouter;
