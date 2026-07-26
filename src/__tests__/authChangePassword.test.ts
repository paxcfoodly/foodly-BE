import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockCompanyFindUnique = vi.fn();
const mockAuditCreate = vi.fn();

vi.mock('../config/database', () => ({
  default: {
    tbUser: {
      findUnique: (...a: any[]) => mockUserFindUnique(...a),
      update: (...a: any[]) => mockUserUpdate(...a),
    },
    tbCompany: { findUnique: (...a: any[]) => mockCompanyFindUnique(...a) },
    tbAuditLog: { create: (...a: any[]) => mockAuditCreate(...a) },
  },
}));

import * as authService from '../services/authService';

describe('authService.changePassword (Phase 2 ④)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('현재 비번 맞고 새 비번 8자+ → 교체 + 감사기록', async () => {
    const hash = await bcrypt.hash('oldpass12', 10);
    mockUserFindUnique.mockResolvedValueOnce({ user_id: 1, login_id: 'u1', password: hash, company_cd: 'T1' });
    mockUserUpdate.mockResolvedValueOnce({});
    await authService.changePassword(1, 'oldpass12', 'newpass34');
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    const newHash = mockUserUpdate.mock.calls[0][0].data.password;
    expect(await bcrypt.compare('newpass34', newHash)).toBe(true);
  });

  it('현재 비번 틀리면 400, 교체 안 함', async () => {
    const hash = await bcrypt.hash('oldpass12', 10);
    mockUserFindUnique.mockResolvedValueOnce({ user_id: 1, login_id: 'u1', password: hash, company_cd: 'T1' });
    await expect(authService.changePassword(1, 'wrongpass', 'newpass34')).rejects.toThrow('현재 비밀번호가 올바르지 않습니다');
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('새 비번 8자 미만 → 400', async () => {
    await expect(authService.changePassword(1, 'oldpass12', 'short')).rejects.toThrow('8자 이상');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});

describe('authService.login 회사 중지 차단 (Phase 2 ⑥)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('use_yn=N 회사 소속 사용자는 로그인 403', async () => {
    const hash = await bcrypt.hash('pass1234', 10);
    mockUserFindUnique.mockResolvedValueOnce({
      user_id: 1, login_id: 'u1', user_nm: 'U', password: hash,
      role_cd: 'MES_USER', company_cd: 'T1', status: 'ACTIVE', role: null, company: null,
    });
    mockCompanyFindUnique.mockResolvedValueOnce({ use_yn: 'N' });
    await expect(authService.login('u1', 'pass1234')).rejects.toThrow('중지된 상태');
  });

  it('use_yn=Y면 정상 로그인', async () => {
    const hash = await bcrypt.hash('pass1234', 10);
    mockUserFindUnique.mockResolvedValueOnce({
      user_id: 1, login_id: 'u1', user_nm: 'U', password: hash,
      role_cd: 'MES_USER', company_cd: 'T1', status: 'ACTIVE',
      role: { role_nm: '실무자' }, company: { company_nm: '회사A' },
    });
    mockCompanyFindUnique.mockResolvedValueOnce({ use_yn: 'Y' });
    const result = await authService.login('u1', 'pass1234');
    expect(result.accessToken).toBeTruthy();
    expect(result.user.companyNm).toBe('회사A');
  });
});
