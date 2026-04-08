import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  changeEquipStatusHandler,
  listEquipStatusesHandler,
  getEquipmentCurrentStatusHandler,
  getEquipmentStatusTimelineHandler,
  listEquipmentsWithCurrentStatusHandler,
} from '../../../controllers/equipStatusController';

const equipStatusesRouter = Router();

equipStatusesRouter.use(authenticate);
equipStatusesRouter.use(requirePermission({ menuUrl: '/equipment/operation' }));

// Must come before /:equipCd to avoid matching
equipStatusesRouter.get('/equipment-list', listEquipmentsWithCurrentStatusHandler);
equipStatusesRouter.get('/', listEquipStatusesHandler);
equipStatusesRouter.get('/:equipCd/current', getEquipmentCurrentStatusHandler);
equipStatusesRouter.get('/:equipCd/timeline', getEquipmentStatusTimelineHandler);
equipStatusesRouter.post('/', changeEquipStatusHandler);

export default equipStatusesRouter;
