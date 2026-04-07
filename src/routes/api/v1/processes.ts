import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { upload } from '../../../utils';
import {
  listProcessesHandler,
  getProcessHandler,
  createProcessHandler,
  updateProcessHandler,
  deleteProcessHandler,
  importProcessesHandler,
  exportProcessesHandler,
} from '../../../controllers/processController';
import {
  listEquipsByProcessHandler,
  addEquipToProcessHandler,
  removeEquipFromProcessHandler,
  updateEquipProcessPriorityHandler,
} from '../../../controllers/equipProcessController';

const processesRouter = Router();

// All routes require authentication + menu-based permission
processesRouter.use(authenticate);
processesRouter.use(requirePermission({ menuUrl: '/master/process' }));

// List processes (paginated + filtered + sorted)
processesRouter.get('/', listProcessesHandler);

// Export to Excel (must be before /:processCd to avoid matching 'export' as a processCd)
processesRouter.get('/export', exportProcessesHandler);

// Get single process
processesRouter.get('/:processCd', getProcessHandler);

// Create process
processesRouter.post('/', createProcessHandler);

// Update process
processesRouter.put('/:processCd', updateProcessHandler);

// Delete process
processesRouter.delete('/:processCd', deleteProcessHandler);

// Bulk import from Excel
processesRouter.post('/import', upload.single('file'), importProcessesHandler);

// ─── Equipment Mapping (nested under process) ───

// List equipment mappings for a process
processesRouter.get('/:processCd/equipments', listEquipsByProcessHandler);

// Add equipment mapping
processesRouter.post('/:processCd/equipments', addEquipToProcessHandler);

// Update equipment mapping priority
processesRouter.patch('/:processCd/equipments/:equipCd', updateEquipProcessPriorityHandler);

// Remove equipment mapping
processesRouter.delete('/:processCd/equipments/:equipCd', removeEquipFromProcessHandler);

export default processesRouter;
