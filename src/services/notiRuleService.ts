import { Request } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination, buildPaginatedResponse } from '../utils';

// ─── List Noti Rules (paginated + filtered) ───

export async function listNotiRules(req: Request) {
  const { page, limit, offset } = parsePagination(req);
  const event_type = req.query.event_type as string | undefined;

  const where = event_type ? { event_type } : {};

  const [total, rules] = await Promise.all([
    prisma.tbNotiRule.count({ where }),
    prisma.tbNotiRule.findMany({
      where,
      include: {
        target_role: { select: { role_nm: true } },
      },
      orderBy: [{ rule_id: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  return buildPaginatedResponse(rules, total, page, limit);
}

// ─── Create Noti Rule ───

export async function createNotiRule(
  data: {
    event_type: string;
    target_role_cd?: string;
    channel?: string;
    template_id?: string;
  },
  userId?: string,
) {
  if (!data.event_type) {
    throw new AppError('event_type은 필수 항목입니다.', 400);
  }
  return prisma.tbNotiRule.create({
    data: {
      event_type: data.event_type,
      target_role_cd: data.target_role_cd,
      channel: data.channel || 'IN_APP',
      template_id: data.template_id,
      use_yn: 'Y',
      create_by: userId,
      update_by: userId,
    },
    include: {
      target_role: { select: { role_nm: true } },
    },
  });
}

// ─── Update Noti Rule ───

export async function updateNotiRule(
  ruleId: number,
  data: {
    event_type?: string;
    target_role_cd?: string;
    channel?: string;
    template_id?: string;
    use_yn?: string;
  },
  userId?: string,
) {
  const existing = await prisma.tbNotiRule.findUnique({ where: { rule_id: ruleId } });
  if (!existing) {
    throw new AppError('해당 알림 규칙을 찾을 수 없습니다.', 404);
  }
  return prisma.tbNotiRule.update({
    where: { rule_id: ruleId },
    data: {
      ...(data.event_type !== undefined && { event_type: data.event_type }),
      ...(data.target_role_cd !== undefined && { target_role_cd: data.target_role_cd }),
      ...(data.channel !== undefined && { channel: data.channel }),
      ...(data.template_id !== undefined && { template_id: data.template_id }),
      ...(data.use_yn !== undefined && { use_yn: data.use_yn }),
      update_by: userId,
    },
    include: {
      target_role: { select: { role_nm: true } },
    },
  });
}

// ─── Delete Noti Rule ───

export async function deleteNotiRule(ruleId: number) {
  const existing = await prisma.tbNotiRule.findUnique({ where: { rule_id: ruleId } });
  if (!existing) {
    throw new AppError('해당 알림 규칙을 찾을 수 없습니다.', 404);
  }
  return prisma.tbNotiRule.delete({ where: { rule_id: ruleId } });
}
