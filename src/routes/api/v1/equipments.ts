import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { upload } from '../../../utils';
import {
  listEquipmentsHandler,
  getEquipmentHandler,
  createEquipmentHandler,
  updateEquipmentHandler,
  deleteEquipmentHandler,
  importEquipmentsHandler,
  exportEquipmentsHandler,
} from '../../../controllers/equipmentController';

const equipmentsRouter = Router();

// All routes require authentication + menu-based permission
equipmentsRouter.use(authenticate);
equipmentsRouter.use(requirePermission({ menuUrl: '/master/equipment' }));

// List equipments (paginated + filtered + sorted)
equipmentsRouter.get('/', listEquipmentsHandler);

// Export to Excel (must be before /:equipCd to avoid matching 'export' as an equipCd)
equipmentsRouter.get('/export', exportEquipmentsHandler);

// Get single equipment
equipmentsRouter.get('/:equipCd', getEquipmentHandler);

// Create equipment
equipmentsRouter.post('/', createEquipmentHandler);

// Update equipment
equipmentsRouter.put('/:equipCd', updateEquipmentHandler);

// Delete equipment
equipmentsRouter.delete('/:equipCd', deleteEquipmentHandler);

// Bulk import from Excel
equipmentsRouter.post('/import', upload.single('file'), importEquipmentsHandler);

export default equipmentsRouter;
