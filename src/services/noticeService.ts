import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

const noticeSelect = {
  notice_id: true,
  title: true,
  content: true,
  is_popup: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

export interface NoticeListParams {
  page: number;
  limit: number;
  offset: number;
  where: Record<string, unknown>;
  orderBy: Array<Record<string, string>>;
}

export async function listNotices(params: NoticeListParams) {
  const { page, limit, offset, where, orderBy } = params;
  const effectiveOrderBy = orderBy.length > 0 ? orderBy : [{ notice_id: 'desc' }];

  const [notices, total] = await Promise.all([
    prisma.tbNotice.findMany({
      where,
      select: noticeSelect,
      orderBy: effectiveOrderBy as any,
      skip: offset,
      take: limit,
    }),
    prisma.tbNotice.count({ where }),
  ]);

  return { notices, total, page, limit };
}

export async function getNoticeById(noticeId: number) {
  const notice = await prisma.tbNotice.findUnique({
    where: { notice_id: noticeId },
    select: noticeSelect,
  });
  if (!notice) throw new AppError('공지사항을 찾을 수 없습니다.', 404);
  return notice;
}

/**
 * Get active popup notices.
 */
export async function getPopupNotices() {
  return prisma.tbNotice.findMany({
    where: { is_popup: 'Y' },
    select: noticeSelect,
    orderBy: { notice_id: 'desc' },
  });
}

export interface NoticeCreateInput {
  title: string;
  content?: string;
  is_popup?: string;
  create_by?: string;
}

export async function createNotice(input: NoticeCreateInput) {
  return prisma.tbNotice.create({
    data: {
      title: input.title,
      content: input.content ?? null,
      is_popup: input.is_popup === 'Y' ? 'Y' : 'N',
      create_by: input.create_by ?? null,
      update_by: input.create_by ?? null,
    },
    select: noticeSelect,
  });
}

export interface NoticeUpdateInput {
  title?: string;
  content?: string;
  is_popup?: string;
  update_by?: string;
}

export async function updateNotice(noticeId: number, input: NoticeUpdateInput) {
  const existing = await prisma.tbNotice.findUnique({ where: { notice_id: noticeId } });
  if (!existing) throw new AppError('공지사항을 찾을 수 없습니다.', 404);

  return prisma.tbNotice.update({
    where: { notice_id: noticeId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.is_popup !== undefined && { is_popup: input.is_popup }),
      update_by: input.update_by ?? null,
      update_dt: new Date(),
    },
    select: noticeSelect,
  });
}

export async function deleteNotice(noticeId: number) {
  const existing = await prisma.tbNotice.findUnique({ where: { notice_id: noticeId } });
  if (!existing) throw new AppError('공지사항을 찾을 수 없습니다.', 404);

  await prisma.tbNotice.delete({ where: { notice_id: noticeId } });
  return { message: '공지사항이 삭제되었습니다.' };
}
