import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logDataChanges } from './dataHistoryService';
import {
  parsePagination,
  buildPaginatedResponse,
  parseSort,
  parseFilters,
} from '../utils';

// ─── Allowed filter / sort fields ───
const ALLOWED_FIELDS = ['cust_cd', 'cust_nm', 'cust_type', 'biz_no', 'use_yn'];

const customerSelect = {
  cust_cd: true,
  cust_nm: true,
  cust_type: true,
  biz_no: true,
  contact_nm: true,
  tel: true,
  email: true,
  address: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── List (paginated + filtered + sorted) ───

export async function listCustomers(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FIELDS);
  const orderBy = parseSort(req, ALLOWED_FIELDS);

  const [total, customers] = await Promise.all([
    prisma.tbCustomer.count({ where: where as any }),
    prisma.tbCustomer.findMany({
      where: where as any,
      select: customerSelect,
      orderBy: orderBy.length > 0 ? orderBy : [{ cust_cd: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(customers, total, page, limit);
}

// ─── Get by ID ───

export async function getCustomerById(custCd: string) {
  const customer = await prisma.tbCustomer.findUnique({
    where: { cust_cd: custCd },
    select: customerSelect,
  });
  if (!customer) throw new AppError('존재하지 않는 거래처입니다.', 404);
  return customer;
}

// ─── Create ───

export interface CustomerCreateInput {
  cust_cd: string;
  cust_nm: string;
  cust_type?: string | null;
  biz_no?: string | null;
  contact_nm?: string | null;
  tel?: string | null;
  email?: string | null;
  address?: string | null;
  use_yn?: string;
}

export async function createCustomer(input: CustomerCreateInput, userId?: string) {
  const existing = await prisma.tbCustomer.findUnique({ where: { cust_cd: input.cust_cd } });
  if (existing) throw new AppError('이미 존재하는 거래처코드입니다.', 409);

  const customer = await prisma.tbCustomer.create({
    data: {
      cust_cd: input.cust_cd,
      cust_nm: input.cust_nm,
      cust_type: input.cust_type ?? null,
      biz_no: input.biz_no ?? null,
      contact_nm: input.contact_nm ?? null,
      tel: input.tel ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      use_yn: input.use_yn ?? 'Y',
      create_by: userId ?? null,
      update_by: userId ?? null,
    },
    select: customerSelect,
  });
  return customer;
}

// ─── Update (with data history) ───

export interface CustomerUpdateInput {
  cust_nm?: string;
  cust_type?: string | null;
  biz_no?: string | null;
  contact_nm?: string | null;
  tel?: string | null;
  email?: string | null;
  address?: string | null;
  use_yn?: string;
}

export async function updateCustomer(custCd: string, input: CustomerUpdateInput, userId?: string) {
  const existing = await prisma.tbCustomer.findUnique({ where: { cust_cd: custCd }, select: customerSelect });
  if (!existing) throw new AppError('존재하지 않는 거래처입니다.', 404);

  const data: Record<string, unknown> = {
    update_by: userId ?? null,
    update_dt: new Date(),
  };
  if (input.cust_nm !== undefined) data.cust_nm = input.cust_nm;
  if (input.cust_type !== undefined) data.cust_type = input.cust_type;
  if (input.biz_no !== undefined) data.biz_no = input.biz_no;
  if (input.contact_nm !== undefined) data.contact_nm = input.contact_nm;
  if (input.tel !== undefined) data.tel = input.tel;
  if (input.email !== undefined) data.email = input.email;
  if (input.address !== undefined) data.address = input.address;
  if (input.use_yn !== undefined) data.use_yn = input.use_yn;

  const updated = await prisma.tbCustomer.update({
    where: { cust_cd: custCd },
    data: data as any,
    select: customerSelect,
  });

  const before: Record<string, unknown> = { ...existing };
  const after: Record<string, unknown> = { ...updated };
  logDataChanges('tb_customer', custCd, before, after, null, userId);

  return updated;
}

// ─── Delete (with FK protection) ───

export async function deleteCustomer(custCd: string) {
  const existing = await prisma.tbCustomer.findUnique({ where: { cust_cd: custCd } });
  if (!existing) throw new AppError('존재하지 않는 거래처입니다.', 404);

  try {
    await prisma.tbCustomer.delete({ where: { cust_cd: custCd } });
    return { message: '거래처가 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new AppError('연결된 데이터가 있어 삭제할 수 없습니다.', 409);
    }
    throw err;
  }
}
