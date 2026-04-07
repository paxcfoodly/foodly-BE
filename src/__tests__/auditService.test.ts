import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('../config/database', () => {
  return {
    default: {
      tbAuditLog: {
        create: (...args: any[]) => mockCreate(...args),
      },
    },
  };
});

import { logAudit, logCreate, logUpdate, logDelete } from '../services/auditService';

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ log_id: 1 });
  });

  it('logAudit writes to tb_audit_log', async () => {
    await logAudit({
      userId: 1,
      action: 'CREATE',
      targetTable: 'tb_item',
      recordId: 'ITEM-001',
      afterData: { item_nm: 'Test' },
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.data.action).toBe('CREATE');
    expect(arg.data.target_table).toBe('tb_item');
    expect(arg.data.record_id).toBe('ITEM-001');
  });

  it('logAudit swallows errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    await logAudit({ userId: 1, action: 'CREATE' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT]'),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('logCreate convenience wrapper', async () => {
    await logCreate(1, 'tb_item', 'ITEM-001', { item_nm: 'Test' });
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.data.action).toBe('CREATE');
    expect(arg.data.after_data).toEqual({ item_nm: 'Test' });
  });

  it('logUpdate records before and after', async () => {
    await logUpdate(1, 'tb_item', 'ITEM-001', { item_nm: 'Old' }, { item_nm: 'New' });
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.data.action).toBe('UPDATE');
    expect(arg.data.before_data).toEqual({ item_nm: 'Old' });
    expect(arg.data.after_data).toEqual({ item_nm: 'New' });
  });

  it('logDelete records before data', async () => {
    await logDelete(1, 'tb_item', 'ITEM-001', { item_nm: 'Deleted' });
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.data.action).toBe('DELETE');
    expect(arg.data.before_data).toEqual({ item_nm: 'Deleted' });
  });

  it('handles null userId', async () => {
    await logAudit({ userId: null, action: 'LOGIN_FAIL' });
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.data.user_id).toBeNull();
  });
});
