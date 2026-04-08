import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as shipmentService from '../services/shipmentService';

// ─── List Shipments (paginated) ───

export async function listShipmentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await shipmentService.listShipments(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Shipment by ID ───

export async function getShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }
    const shipment = await shipmentService.getShipmentById(shipId);
    res.json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Create Shipment ───

export async function createShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cust_cd, plan_dt, remark, details } = req.body;

    if (!cust_cd) {
      res.status(400).json(errorResponse('cust_cd는 필수 항목입니다.'));
      return;
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      res.status(400).json(errorResponse('details 배열은 필수 항목입니다.'));
      return;
    }

    const shipment = await shipmentService.createShipment(
      {
        cust_cd,
        plan_dt,
        remark,
        details: details.map((d: any) => ({
          item_cd: d.item_cd,
          lot_no: d.lot_no ?? null,
          order_qty: Number(d.order_qty),
        })),
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Update Shipment ───

export async function updateShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }

    const { cust_cd, plan_dt, remark, details } = req.body;
    const shipment = await shipmentService.updateShipment(
      shipId,
      {
        cust_cd,
        plan_dt,
        remark,
        details: details
          ? details.map((d: any) => ({
              item_cd: d.item_cd,
              lot_no: d.lot_no ?? null,
              order_qty: Number(d.order_qty),
            }))
          : undefined,
      },
      req.user?.loginId,
    );
    res.json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Shipment ───

export async function deleteShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }
    const result = await shipmentService.deleteShipment(shipId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─── Confirm Shipment (PLAN → SHIPPED) ───

export async function confirmShipmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }

    const { details } = req.body;
    if (!details || !Array.isArray(details) || details.length === 0) {
      res.status(400).json(errorResponse('details 배열은 필수 항목입니다.'));
      return;
    }

    const shipment = await shipmentService.confirmShipment(
      shipId,
      {
        details: details.map((d: any) => ({
          ship_dtl_id: Number(d.ship_dtl_id),
          actual_qty: Number(d.actual_qty),
        })),
      },
      req.user?.loginId,
    );
    res.json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Cancel Request (SHIPPED → CANCEL_REQ) ───

export async function cancelRequestHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }

    const { cancel_reason } = req.body;
    if (!cancel_reason) {
      res.status(400).json(errorResponse('cancel_reason은 필수 항목입니다.'));
      return;
    }

    const shipment = await shipmentService.cancelRequest(shipId, cancel_reason, req.user?.loginId);
    res.json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Approve Cancel (CANCEL_REQ → CANCELLED) ───

export async function approveCancelHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }
    const shipment = await shipmentService.approveCancelShipment(shipId, req.user?.loginId);
    res.json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Reject Cancel (CANCEL_REQ → SHIPPED) ───

export async function rejectCancelHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }
    const shipment = await shipmentService.rejectCancelShipment(shipId, req.user?.loginId);
    res.json(successResponse(shipment));
  } catch (err) {
    next(err);
  }
}

// ─── Get Eligible LOTs ───

export async function getEligibleLotsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item_cd = req.query.item_cd as string | undefined;
    const lots = await shipmentService.getEligibleLots(item_cd);
    res.json(successResponse(lots));
  } catch (err) {
    next(err);
  }
}

// ─── Download PDF (stub — implemented in Plan 03) ───

export async function downloadPdfHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shipId = parseInt(req.params.shipId as string, 10);
    if (isNaN(shipId)) {
      res.status(400).json(errorResponse('유효하지 않은 출하 ID입니다.'));
      return;
    }
    const type = req.query.type as string | undefined;
    if (!type || !['order', 'statement', 'delivery', 'inspection'].includes(type)) {
      res.status(400).json(errorResponse('type은 order, statement, delivery, inspection 중 하나여야 합니다.'));
      return;
    }
    res.status(501).json(errorResponse('PDF generation not yet implemented'));
  } catch (err) {
    next(err);
  }
}
