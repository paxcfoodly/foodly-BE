import { Request, Response, NextFunction } from 'express';
import { basePrisma } from '../config/database';

// 감사 기록 대상이 아닌 경로 (조회성 POST·인증 자체 로그는 authService가 별도 기록)
const SKIP_PREFIXES = ['/excel', '/auth'];

/**
 * 요청 레벨 감사 로그 (멀티테넌시 Phase 2 ②).
 *
 * 인증된 라우트의 변경 요청(POST/PUT/PATCH/DELETE)이 성공(2xx)하면
 * tb_audit_log에 회사·사용자·action·대상을 기록한다. 필드 단위 before/after
 * diff는 범위 밖 — 요청 단위 감사로 전 CUD를 완전 커버한다.
 *
 * 확장 컨텍스트 타이밍에 의존하지 않도록 basePrisma에 company_cd를 명시 기록.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  // /api/v1 프리픽스 제거 후 첫 세그먼트가 대상 리소스
  const pathAfterV1 = req.baseUrl.replace(/^\/api\/v1/, '') + req.path;
  const cleaned = pathAfterV1.replace(/\/+/g, '/');
  if (SKIP_PREFIXES.some((p) => cleaned.startsWith(p))) {
    next();
    return;
  }

  res.on('finish', () => {
    // 성공(2xx)만 기록 — 검증 실패·권한 거부는 감사 대상 아님
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const user = req.user;
    if (!user) return; // 인증 안 된 요청은 기록 안 함

    const segments = cleaned.split('/').filter(Boolean);
    const targetTable = segments[0] ?? 'unknown';
    const recordId = req.params.id ?? req.params.shipId ?? segments[1] ?? null;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress || null;
    // 회사코드: 일반 사용자=소속사, SYS_ADMIN=대상 헤더 또는 SYSTEM
    const headerCompany = typeof req.headers['x-company-cd'] === 'string'
      ? (req.headers['x-company-cd'] as string).trim() : '';
    const companyCd = user.companyCd || headerCompany || 'SYSTEM';

    basePrisma.tbAuditLog.create({
      data: {
        company_cd: companyCd,
        user_id: user.userId,
        action: method, // POST/PUT/PATCH/DELETE
        target_table: targetTable,
        record_id: recordId ? String(recordId) : null,
        ip_address: ipAddress,
      },
    }).catch((err) => console.error('[AUDIT] 요청 감사 기록 실패:', err));
  });

  next();
}
