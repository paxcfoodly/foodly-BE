import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination, buildPaginatedResponse, parseSort, parseFilters } from '../utils';

const VALID_STATUS_TYPES = ['RUN', 'IDLE', 'DOWN', 'SETUP'];
const NON_RUN_STATUSES = ['IDLE', 'DOWN', 'SETUP'];

// ─── Change Equipment Status ───

export interface EquipStatusInput {
  equip_cd: string;
  status_type: string;
  down_reason_cd?: string | null;
  memo?: string | null;
}

export async function changeEquipStatus(input: EquipStatusInput, userId?: string) {
  const { equip_cd, status_type, down_reason_cd, memo } = input;

  // Validate status_type whitelist (T-08-01)
  if (!VALID_STATUS_TYPES.includes(status_type)) {
    throw new AppError(`status_type은 ${VALID_STATUS_TYPES.join(', ')} 중 하나여야 합니다.`, 400);
  }

  // Validate down_reason_cd required for non-RUN statuses (T-08-01, D-02)
  if (NON_RUN_STATUSES.includes(status_type) && !down_reason_cd) {
    throw new AppError('IDLE/DOWN/SETUP 상태 변경 시 down_reason_cd는 필수입니다.', 400);
  }

  // Verify equipment exists
  const equip = await prisma.tbEquipment.findUnique({ where: { equip_cd } });
  if (!equip) throw new AppError('존재하지 않는 설비입니다.', 404);

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Find and close previous active status
    const prevStatus = await tx.tbEquipStatus.findFirst({
      where: { equip_cd, end_dt: null },
      orderBy: { start_dt: 'desc' },
    });

    if (prevStatus) {
      const durationMs = now.getTime() - (prevStatus.start_dt?.getTime() ?? now.getTime());
      const durationMin = Math.round(durationMs / 60000);
      await tx.tbEquipStatus.update({
        where: { status_id: prevStatus.status_id },
        data: {
          end_dt: now,
          duration: durationMin,
          update_by: userId ?? null,
          update_dt: now,
        },
      });
    }

    // Create new status record
    const newStatus = await tx.tbEquipStatus.create({
      data: {
        equip_cd,
        status_type,
        down_reason_cd: down_reason_cd ?? null,
        memo: memo ?? null,
        start_dt: now,
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
    });

    return newStatus;
  });
}

// ─── List Equipment Statuses (paginated) ───

const ALLOWED_FILTER_FIELDS = ['equip_cd', 'status_type'];
const ALLOWED_SORT_FIELDS = ['status_id', 'equip_cd', 'start_dt', 'end_dt'];

export async function listEquipStatuses(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const where = parseFilters(req, ALLOWED_FILTER_FIELDS) as Record<string, any>;
  const orderBy = parseSort(req, ALLOWED_SORT_FIELDS);

  // Date range filter
  const { start_dt_from, start_dt_to } = req.query as Record<string, string>;
  if (start_dt_from || start_dt_to) {
    where.start_dt = {};
    if (start_dt_from) where.start_dt.gte = new Date(start_dt_from);
    if (start_dt_to) where.start_dt.lte = new Date(start_dt_to);
  }

  const [total, statuses] = await Promise.all([
    prisma.tbEquipStatus.count({ where }),
    prisma.tbEquipStatus.findMany({
      where,
      include: { equipment: { select: { equip_nm: true } } },
      orderBy: orderBy.length > 0 ? orderBy : [{ status_id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(statuses, total, page, limit);
}

// ─── Get Current Status for Single Equipment ───

export async function getEquipmentCurrentStatus(equipCd: string) {
  const status = await prisma.tbEquipStatus.findFirst({
    where: { equip_cd: equipCd, end_dt: null },
    orderBy: { start_dt: 'desc' },
    include: { equipment: { select: { equip_nm: true } } },
  });
  return status;
}

// ─── Get Status Timeline for Equipment ───

export async function getEquipmentStatusTimeline(equipCd: string, startDate: string, endDate: string) {
  const statuses = await prisma.tbEquipStatus.findMany({
    where: {
      equip_cd: equipCd,
      start_dt: { gte: new Date(startDate) },
      OR: [
        { end_dt: { lte: new Date(endDate) } },
        { end_dt: null },
      ],
    },
    orderBy: { start_dt: 'asc' },
    include: { equipment: { select: { equip_nm: true } } },
  });
  return statuses;
}

// ─── List Equipments with Current Status ───

export async function listEquipmentsWithCurrentStatus(req: Request) {
  const { page, limit, offset } = parsePagination(req);

  const [total, equipments] = await Promise.all([
    prisma.tbEquipment.count({ where: { use_yn: 'Y' } }),
    prisma.tbEquipment.findMany({
      where: { use_yn: 'Y' },
      include: {
        equip_statuses: {
          where: { end_dt: null },
          take: 1,
          orderBy: { start_dt: 'desc' },
        },
      },
      orderBy: { equip_cd: 'asc' },
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(equipments, total, page, limit);
}
