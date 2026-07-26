import prisma from '../config/database';
import { basePrisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { getTenantContext } from '../middlewares/tenantContext';

/**
 * 알림 서비스 (멀티테넌시 Phase 2 ①).
 *
 * - notify(): 도메인 이벤트에서 호출하는 생성 헬퍼. target_user_id=null이면
 *   회사 브로드캐스트(회사 전체 사용자 대상).
 * - 알림함 조회는 target_user_id IS NULL(브로드캐스트) OR = 본인 것만.
 * - company_cd는 테넌트 확장이 주입. 컨텍스트 밖 호출은 companyCd 명시 필요.
 */
export interface NotifyParams {
  companyCd: string;
  targetUserId?: number | null; // null = 회사 브로드캐스트
  type?: string; // 'SHIPMENT', 'DEFECT', 'WORK_ORDER' 등
  title: string;
  content?: string;
}

/**
 * 알림 생성 — 컨텍스트에 의존하지 않도록 basePrisma + 명시 company_cd.
 * 도메인 서비스가 트랜잭션 성공 후 호출한다. 실패해도 본 흐름을 깨지 않는다.
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    await basePrisma.tbNotification.create({
      data: {
        company_cd: params.companyCd,
        target_user_id: params.targetUserId ?? null,
        noti_type: params.type ?? null,
        noti_title: params.title,
        noti_content: params.content ?? null,
        channel: 'WEB',
        send_status: 'SENT',
        read_yn: 'N',
      },
    });
  } catch (err) {
    console.error('[NOTI] 알림 생성 실패:', err);
  }
}

/**
 * 현재 요청 컨텍스트의 회사로 브로드캐스트 알림 생성.
 * 도메인 이벤트(출하취소/불량/작업지시)에서 호출. 컨텍스트 없으면 조용히 skip.
 */
export async function notifyCurrentCompany(type: string, title: string, content?: string): Promise<void> {
  const ctx = getTenantContext();
  const companyCd = ctx?.bypass ? ctx.adminWriteCompanyCd : ctx?.companyCd;
  if (!companyCd) return; // 시스템 컨텍스트 또는 대상 회사 미상 — 알림 생략
  await notify({ companyCd, targetUserId: null, type, title, content });
}

/** 내 알림함 — 회사 브로드캐스트 + 나에게 온 알림 (테넌트 확장이 회사 격리) */
export async function listMine(userId: number, limit = 50) {
  return prisma.tbNotification.findMany({
    where: { OR: [{ target_user_id: null }, { target_user_id: userId }] },
    orderBy: { create_dt: 'desc' },
    take: limit,
  });
}

/** 내 미읽음 수 */
export async function unreadCount(userId: number): Promise<number> {
  return prisma.tbNotification.count({
    where: { read_yn: 'N', OR: [{ target_user_id: null }, { target_user_id: userId }] },
  });
}

/** 단건 읽음 처리 (내 알림/회사 브로드캐스트만) */
export async function markRead(notiId: number, userId: number): Promise<void> {
  const noti = await prisma.tbNotification.findUnique({ where: { noti_id: notiId } });
  if (!noti) throw new AppError('알림을 찾을 수 없습니다.', 404);
  if (noti.target_user_id !== null && noti.target_user_id !== userId) {
    throw new AppError('알림을 찾을 수 없습니다.', 404);
  }
  await prisma.tbNotification.update({ where: { noti_id: notiId }, data: { read_yn: 'Y' } });
}

/** 내 알림 전체 읽음 */
export async function markAllRead(userId: number): Promise<number> {
  const result = await prisma.tbNotification.updateMany({
    where: { read_yn: 'N', OR: [{ target_user_id: null }, { target_user_id: userId }] },
    data: { read_yn: 'Y' },
  });
  return result.count;
}
