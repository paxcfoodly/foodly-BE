import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/database', () => {
  return {
    default: {
      tbDataHistory: {
        create: vi.fn(),
        createMany: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

import prisma from '../config/database';
import {
  logDataHistory,
  logDataChanges,
  getDataHistory,
} from '../services/dataHistoryService';

describe('dataHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logDataHistory', () => {
    it('creates a history record', async () => {
      vi.mocked(prisma.tbDataHistory.create).mockResolvedValue({} as any);

      await logDataHistory({
        tableNm: 'TB_ITEM',
        recordId: 'ITEM001',
        columnNm: 'item_nm',
        beforeValue: '구품명',
        afterValue: '신품명',
        changeReason: '오타수정',
        changeBy: 'admin',
      });

      expect(prisma.tbDataHistory.create).toHaveBeenCalledWith({
        data: {
          table_nm: 'TB_ITEM',
          record_id: 'ITEM001',
          column_nm: 'item_nm',
          before_value: '구품명',
          after_value: '신품명',
          change_reason: '오타수정',
          change_by: 'admin',
        },
      });
    });

    it('swallows errors without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.tbDataHistory.create).mockRejectedValue(new Error('DB error'));

      // Should not throw
      await logDataHistory({
        tableNm: 'TB_ITEM',
        recordId: 'X',
        columnNm: 'col',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DATA_HISTORY] Failed to write data history:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('handles null optional fields', async () => {
      vi.mocked(prisma.tbDataHistory.create).mockResolvedValue({} as any);

      await logDataHistory({
        tableNm: 'TB_ITEM',
        recordId: 'ITEM001',
        columnNm: 'use_yn',
      });

      expect(prisma.tbDataHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          before_value: null,
          after_value: null,
          change_reason: null,
          change_by: null,
        }),
      });
    });
  });

  describe('logDataChanges', () => {
    it('logs only changed columns', async () => {
      vi.mocked(prisma.tbDataHistory.createMany).mockResolvedValue({ count: 1 } as any);

      const before = { item_nm: '품명A', unit_cd: 'EA', use_yn: 'Y' };
      const after = { item_nm: '품명B', unit_cd: 'EA', use_yn: 'Y' };

      await logDataChanges('TB_ITEM', 'ITEM001', before, after, '수정', 'admin');

      expect(prisma.tbDataHistory.createMany).toHaveBeenCalledWith({
        data: [
          {
            table_nm: 'TB_ITEM',
            record_id: 'ITEM001',
            column_nm: 'item_nm',
            before_value: '품명A',
            after_value: '품명B',
            change_reason: '수정',
            change_by: 'admin',
          },
        ],
      });
    });

    it('does not call createMany when nothing changed', async () => {
      const before = { item_nm: '품명A', use_yn: 'Y' };
      const after = { item_nm: '품명A', use_yn: 'Y' };

      await logDataChanges('TB_ITEM', 'ITEM001', before, after);

      expect(prisma.tbDataHistory.createMany).not.toHaveBeenCalled();
    });

    it('logs multiple changed columns', async () => {
      vi.mocked(prisma.tbDataHistory.createMany).mockResolvedValue({ count: 2 } as any);

      const before = { item_nm: 'A', unit_cd: 'EA' };
      const after = { item_nm: 'B', unit_cd: 'KG' };

      await logDataChanges('TB_ITEM', 'ITEM001', before, after);

      const call = vi.mocked(prisma.tbDataHistory.createMany).mock.calls[0][0];
      expect((call as any).data).toHaveLength(2);
    });

    it('swallows errors without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.tbDataHistory.createMany).mockRejectedValue(new Error('DB error'));

      const before = { item_nm: 'A' };
      const after = { item_nm: 'B' };

      await logDataChanges('TB_ITEM', 'X', before, after);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getDataHistory', () => {
    it('queries with table and recordId', async () => {
      const mockItems = [
        { history_id: 1, table_nm: 'TB_ITEM', record_id: 'ITEM001', column_nm: 'item_nm', before_value: 'A', after_value: 'B', change_reason: null, change_by: 'admin', change_dt: new Date() },
      ];
      vi.mocked(prisma.tbDataHistory.count).mockResolvedValue(1);
      vi.mocked(prisma.tbDataHistory.findMany).mockResolvedValue(mockItems as any);

      const result = await getDataHistory('TB_ITEM', 'ITEM001');

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('queries with table only (no recordId)', async () => {
      vi.mocked(prisma.tbDataHistory.count).mockResolvedValue(0);
      vi.mocked(prisma.tbDataHistory.findMany).mockResolvedValue([]);

      const result = await getDataHistory('TB_ITEM');

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('respects page and limit options', async () => {
      vi.mocked(prisma.tbDataHistory.count).mockResolvedValue(100);
      vi.mocked(prisma.tbDataHistory.findMany).mockResolvedValue([]);

      const result = await getDataHistory('TB_ITEM', undefined, { page: 3, limit: 20 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(5);

      expect(prisma.tbDataHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
    });
  });
});
