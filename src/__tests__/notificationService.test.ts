import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNotiCreate = vi.fn();
const mockNotiFindMany = vi.fn();
const mockNotiCount = vi.fn();
const mockNotiFindUnique = vi.fn();
const mockNotiUpdate = vi.fn();
const mockNotiUpdateMany = vi.fn();

vi.mock('../config/database', () => ({
  default: {
    tbNotification: {
      findMany: (...a: any[]) => mockNotiFindMany(...a),
      count: (...a: any[]) => mockNotiCount(...a),
      findUnique: (...a: any[]) => mockNotiFindUnique(...a),
      update: (...a: any[]) => mockNotiUpdate(...a),
      updateMany: (...a: any[]) => mockNotiUpdateMany(...a),
    },
  },
  basePrisma: {
    tbNotification: { create: (...a: any[]) => mockNotiCreate(...a) },
  },
}));

import * as notificationService from '../services/notificationService';
import { runWithTenant } from '../middlewares/tenantContext';

describe('notificationService (Phase 2 ①)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('notify: 명시 회사로 브로드캐스트 알림 생성 (basePrisma)', async () => {
    await notificationService.notify({ companyCd: 'T1', title: '테스트', type: 'DEFECT' });
    expect(mockNotiCreate).toHaveBeenCalledTimes(1);
    const arg = mockNotiCreate.mock.calls[0][0];
    expect(arg.data.company_cd).toBe('T1');
    expect(arg.data.target_user_id).toBeNull();
    expect(arg.data.read_yn).toBe('N');
  });

  it('notifyCurrentCompany: 컨텍스트 회사로 생성', async () => {
    await runWithTenant({ companyCd: 'CO_A', bypass: false, adminWriteCompanyCd: null }, async () => {
      await notificationService.notifyCurrentCompany('WORK_ORDER', '작업지시', '내용');
    });
    expect(mockNotiCreate).toHaveBeenCalledTimes(1);
    expect(mockNotiCreate.mock.calls[0][0].data.company_cd).toBe('CO_A');
  });

  it('notifyCurrentCompany: 컨텍스트 없으면 생성 안 함', async () => {
    await notificationService.notifyCurrentCompany('X', '제목');
    expect(mockNotiCreate).not.toHaveBeenCalled();
  });

  it('listMine: 브로드캐스트 + 본인 알림만 조회', async () => {
    mockNotiFindMany.mockResolvedValueOnce([]);
    await notificationService.listMine(42);
    const where = mockNotiFindMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ target_user_id: null }, { target_user_id: 42 }]);
  });

  it('unreadCount: read_yn=N 조건 포함', async () => {
    mockNotiCount.mockResolvedValueOnce(3);
    const n = await notificationService.unreadCount(7);
    expect(n).toBe(3);
    expect(mockNotiCount.mock.calls[0][0].where.read_yn).toBe('N');
  });

  it('markRead: 타인 전용 알림이면 404', async () => {
    mockNotiFindUnique.mockResolvedValueOnce({ noti_id: 1, target_user_id: 999 });
    await expect(notificationService.markRead(1, 42)).rejects.toThrow('알림을 찾을 수 없습니다');
    expect(mockNotiUpdate).not.toHaveBeenCalled();
  });

  it('markRead: 브로드캐스트(null)는 누구나 읽음 처리', async () => {
    mockNotiFindUnique.mockResolvedValueOnce({ noti_id: 1, target_user_id: null });
    mockNotiUpdate.mockResolvedValueOnce({});
    await notificationService.markRead(1, 42);
    expect(mockNotiUpdate).toHaveBeenCalledTimes(1);
  });
});
