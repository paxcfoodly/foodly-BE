import { AsyncLocalStorage } from 'node:async_hooks';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../types/apiResponse';

/**
 * 테넌트 컨텍스트 (멀티테넌시 스펙 D-5/D-6/D-14)
 *
 * - 일반 사용자: JWT의 companyCd로 모든 쿼리가 자동 필터링된다.
 * - SYS_ADMIN: 조회는 전사 bypass. 쓰기는 X-Company-Cd 헤더가 있을 때만
 *   해당 회사 소유로 수행 (없으면 Prisma 확장에서 400).
 * - 컨텍스트 없음(시드/스크립트/배치): 필터 미적용 — 시스템 컨텍스트.
 */
export interface TenantContext {
  companyCd: string | null; // 일반 사용자의 소속 회사
  bypass: boolean; // SYS_ADMIN 전사 조회
  adminWriteCompanyCd: string | null; // SYS_ADMIN 쓰기 대상 회사 (D-14)
}

const als = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return als.getStore();
}

/** raw query용 헬퍼 — 필터가 필요하면 회사코드, bypass/시스템 컨텍스트면 null */
export function getTenantFilterCd(): string | null {
  const ctx = als.getStore();
  if (!ctx || ctx.bypass) return null;
  return ctx.companyCd;
}

/** 테스트/스크립트에서 명시적으로 컨텍스트를 씌울 때 사용 */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/**
 * authenticate 이후에 장착. req.user 기준으로 테넌트 컨텍스트를 연다.
 * companyCd 없는 비관리자 계정은 403 (D-5 — null 권한 상승 차단).
 */
export function tenantContext(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    next(); // 인증 미들웨어가 없는 라우트 (public) — 시스템 컨텍스트 아님, 필터 없음
    return;
  }
  if (user.roleCd === 'SYS_ADMIN') {
    const header = req.headers['x-company-cd'];
    const adminWriteCompanyCd = typeof header === 'string' && header.trim() ? header.trim() : null;
    als.run({ companyCd: null, bypass: true, adminWriteCompanyCd }, next);
    return;
  }
  if (!user.companyCd) {
    res.status(403).json(errorResponse('소속 회사가 없는 계정입니다. 관리자에게 문의하세요.'));
    return;
  }
  als.run({ companyCd: user.companyCd, bypass: false, adminWriteCompanyCd: null }, next);
}
