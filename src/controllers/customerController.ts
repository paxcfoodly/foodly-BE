import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as customerService from '../services/customerService';

// ─── List Customers (paginated) ───

export async function listCustomersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await customerService.listCustomers(req);
    res.json(successResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
}

// ─── Get Customer by ID ───

export async function getCustomerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const custCd = req.params.custCd as string;
    const customer = await customerService.getCustomerById(custCd);
    res.json(successResponse(customer));
  } catch (err) {
    next(err);
  }
}

// ─── Create Customer ───

export async function createCustomerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cust_cd, cust_nm, cust_type, biz_no, contact_nm, tel, email, address, use_yn } = req.body;

    if (!cust_cd || !cust_nm) {
      res.status(400).json(errorResponse('cust_cd, cust_nm은 필수 항목입니다.'));
      return;
    }

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const customer = await customerService.createCustomer(
      {
        cust_cd,
        cust_nm,
        cust_type: cust_type ?? null,
        biz_no: biz_no ?? null,
        contact_nm: contact_nm ?? null,
        tel: tel ?? null,
        email: email ?? null,
        address: address ?? null,
        use_yn,
      },
      req.user?.loginId,
    );
    res.status(201).json(successResponse(customer));
  } catch (err) {
    next(err);
  }
}

// ─── Update Customer ───

export async function updateCustomerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const custCd = req.params.custCd as string;
    const { cust_nm, cust_type, biz_no, contact_nm, tel, email, address, use_yn } = req.body;

    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }

    const customer = await customerService.updateCustomer(
      custCd,
      { cust_nm, cust_type, biz_no, contact_nm, tel, email, address, use_yn },
      req.user?.loginId,
    );
    res.json(successResponse(customer));
  } catch (err) {
    next(err);
  }
}

// ─── Delete Customer ───

export async function deleteCustomerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const custCd = req.params.custCd as string;
    const result = await customerService.deleteCustomer(custCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
