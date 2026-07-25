import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  tenantContext,
  getTenantContext,
  getTenantFilterCd,
  runWithTenant,
} from '../middlewares/tenantContext';
import { generateNumber } from '../services/numberingService';

// numberingService의 컨텍스트 채번 검증용 prisma mock
const mockQueryRawUnsafe = vi.fn();
vi.mock('../config/database', () => ({
  default: {
    $transaction: (fn: (tx: any) => Promise<any>) =>
      fn({ $queryRawUnsafe: mockQueryRawUnsafe }),
  },
}));

function makeReqRes(user?: any, headers: Record<string, string> = {}) {
  const req: any = { user, headers };
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  return { req, res };
}

describe('tenantContext 미들웨어 (D-5/D-14)', () => {
  it('일반 사용자: companyCd로 컨텍스트를 연다', () => {
    const { req, res } = makeReqRes({ roleCd: 'MES_USER', companyCd: 'T1' });
    let captured: any;
    tenantContext(req, res, () => { captured = getTenantContext(); });
    expect(captured).toEqual({ companyCd: 'T1', bypass: false, adminWriteCompanyCd: null });
  });

  it('SYS_ADMIN: bypass + X-Company-Cd 헤더를 쓰기 대상 회사로', () => {
    const { req, res } = makeReqRes(
      { roleCd: 'SYS_ADMIN', companyCd: null },
      { 'x-company-cd': 'T2' },
    );
    let captured: any;
    tenantContext(req, res, () => { captured = getTenantContext(); });
    expect(captured).toEqual({ companyCd: null, bypass: true, adminWriteCompanyCd: 'T2' });
  });

  it('SYS_ADMIN 헤더 없음: bypass, 쓰기 대상 null', () => {
    const { req, res } = makeReqRes({ roleCd: 'SYS_ADMIN', companyCd: null });
    let captured: any;
    tenantContext(req, res, () => { captured = getTenantContext(); });
    expect(captured?.bypass).toBe(true);
    expect(captured?.adminWriteCompanyCd).toBeNull();
  });

  it('소속 회사 없는 비관리자: 403 차단 (null 권한 상승 방지)', () => {
    const { req, res } = makeReqRes({ roleCd: 'MES_USER', companyCd: null });
    const next = vi.fn();
    tenantContext(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('req.user 없음(public 라우트): 컨텍스트 없이 통과', () => {
    const { req, res } = makeReqRes(undefined);
    let captured: any = 'sentinel';
    tenantContext(req, res, () => { captured = getTenantContext(); });
    expect(captured).toBeUndefined();
  });

  it('getTenantFilterCd: 일반 사용자=회사코드, bypass=null, 컨텍스트 밖=null', () => {
    expect(getTenantFilterCd()).toBeNull();
    runWithTenant({ companyCd: 'T1', bypass: false, adminWriteCompanyCd: null }, () => {
      expect(getTenantFilterCd()).toBe('T1');
    });
    runWithTenant({ companyCd: null, bypass: true, adminWriteCompanyCd: 'T2' }, () => {
      expect(getTenantFilterCd()).toBeNull();
    });
  });
});

describe('채번 컨텍스트 연동 (D-8)', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
  });

  it('컨텍스트의 회사로 채번하고 잠금 쿼리에 회사가 들어간다', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ num_type: 'WO', prefix: 'WO', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0, update_dt: new Date() }])
      .mockResolvedValueOnce(undefined);
    const result = await runWithTenant(
      { companyCd: 'T9', bypass: false, adminWriteCompanyCd: null },
      () => generateNumber('WO'),
    );
    expect(result).toMatch(/^WO-\d{8}-001$/);
    expect(mockQueryRawUnsafe.mock.calls[0][1]).toBe('T9'); // SELECT ... company_cd = $1
    expect(mockQueryRawUnsafe.mock.calls[1][2]).toBe('T9'); // UPDATE ... company_cd = $2
  });

  it('회사별 시퀀스 독립: 같은 num_type이라도 회사 파라미터가 분리된다', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ num_type: 'WO', prefix: 'WO', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 5, update_dt: new Date() }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ num_type: 'WO', prefix: 'WO', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0, update_dt: new Date() }])
      .mockResolvedValueOnce(undefined);
    const a = await generateNumber('WO', 'CO_A');
    const b = await generateNumber('WO', 'CO_B');
    expect(a).toMatch(/-006$/);
    expect(b).toMatch(/-001$/); // B회사는 A회사 시퀀스와 무관하게 1부터
    expect(mockQueryRawUnsafe.mock.calls[0][1]).toBe('CO_A');
    expect(mockQueryRawUnsafe.mock.calls[2][1]).toBe('CO_B');
  });

  it('컨텍스트도 인자도 없으면 400', async () => {
    await expect(generateNumber('WO')).rejects.toThrow('채번 대상 회사를 결정할 수 없습니다');
  });
});
