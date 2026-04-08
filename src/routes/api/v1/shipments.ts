import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission, requireRole } from '../../../middlewares/permission';
import {
  listShipmentsHandler,
  getShipmentHandler,
  createShipmentHandler,
  updateShipmentHandler,
  deleteShipmentHandler,
  confirmShipmentHandler,
  cancelRequestHandler,
  approveCancelHandler,
  rejectCancelHandler,
  getEligibleLotsHandler,
  downloadPdfHandler,
} from '../../../controllers/shipmentController';

const shipmentsRouter = Router();
shipmentsRouter.use(authenticate);

// Eligible LOTs (before :shipId to avoid route conflict)
shipmentsRouter.get('/eligible-lots', requirePermission({ menuUrl: '/shipment/order' }), getEligibleLotsHandler);

// List
shipmentsRouter.get('/', requirePermission({ menuUrl: '/shipment/order' }), listShipmentsHandler);

// Get single
shipmentsRouter.get('/:shipId', requirePermission({ menuUrl: '/shipment/order' }), getShipmentHandler);

// Create
shipmentsRouter.post('/', requirePermission({ menuUrl: '/shipment/order' }), createShipmentHandler);

// Update (PLAN only)
shipmentsRouter.put('/:shipId', requirePermission({ menuUrl: '/shipment/order' }), updateShipmentHandler);

// Delete (PLAN only)
shipmentsRouter.delete('/:shipId', requirePermission({ menuUrl: '/shipment/order' }), deleteShipmentHandler);

// Confirm (PLAN -> SHIPPED)
shipmentsRouter.patch('/:shipId/confirm', requirePermission({ menuUrl: '/shipment/process' }), confirmShipmentHandler);

// Cancel request (SHIPPED -> CANCEL_REQ)
shipmentsRouter.patch('/:shipId/cancel-request', requirePermission({ menuUrl: '/shipment/order' }), cancelRequestHandler);

// Cancel approve (CANCEL_REQ -> CANCELLED) — admin only per D-05
shipmentsRouter.patch('/:shipId/cancel-approve', requireRole('SYS_ADMIN', 'PROD_MGR'), approveCancelHandler);

// Cancel reject (CANCEL_REQ -> SHIPPED) — admin only per D-05
shipmentsRouter.patch('/:shipId/cancel-reject', requireRole('SYS_ADMIN', 'PROD_MGR'), rejectCancelHandler);

// PDF download (stub — implemented in Plan 03)
shipmentsRouter.get('/:shipId/pdf', requirePermission({ menuUrl: '/shipment/order' }), downloadPdfHandler);

export default shipmentsRouter;
