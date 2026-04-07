import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { upload } from '../../../utils';
import {
  listBomsHandler,
  getBomHandler,
  createBomHandler,
  updateBomHandler,
  deleteBomHandler,
  getForwardTreeHandler,
  getReverseTreeHandler,
  importBomsHandler,
  exportBomsHandler,
} from '../../../controllers/bomController';

const bomsRouter = Router();

// All routes require authentication + menu-based permission
bomsRouter.use(authenticate);
bomsRouter.use(requirePermission({ menuUrl: '/master/bom' }));

// List BOMs (paginated + filtered + sorted)
bomsRouter.get('/', listBomsHandler);

// Export to Excel (must be before /:bomId)
bomsRouter.get('/export', exportBomsHandler);

// Tree explosion routes (must be before /:bomId)
bomsRouter.get('/tree/forward/:parentItemCd', getForwardTreeHandler);
bomsRouter.get('/tree/reverse/:childItemCd', getReverseTreeHandler);

// Get single BOM
bomsRouter.get('/:bomId', getBomHandler);

// Create BOM
bomsRouter.post('/', createBomHandler);

// Update BOM
bomsRouter.put('/:bomId', updateBomHandler);

// Bulk import from Excel
bomsRouter.post('/import', upload.single('file'), importBomsHandler);

// Delete BOM
bomsRouter.delete('/:bomId', deleteBomHandler);

export default bomsRouter;
