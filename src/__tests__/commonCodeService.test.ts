import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing the service
vi.mock('../config/database', () => {
  return {
    default: {
      tbCommonCodeGrp: {
        findMany: vi.fn(),
      },
      tbCommonCode: {
        findMany: vi.fn(),
      },
    },
  };
});

import prisma from '../config/database';
import {
  getCodeGroups,
  getCodesByGroup,
  invalidateCodeCache,
} from '../services/commonCodeService';

const mockGroups = [
  { group_cd: 'ITEM_TYPE', group_nm: '품목유형', use_yn: 'Y', create_by: 'SYSTEM', create_dt: new Date(), update_by: null, update_dt: new Date() },
  { group_cd: 'UNIT', group_nm: '단위', use_yn: 'Y', create_by: 'SYSTEM', create_dt: new Date(), update_by: null, update_dt: new Date() },
];

const mockCodes = [
  { group_cd: 'ITEM_TYPE', code: 'RAW', code_nm: '원자재', sort_order: 1, use_yn: 'Y', create_by: 'SYSTEM', create_dt: new Date(), update_by: null, update_dt: new Date() },
  { group_cd: 'ITEM_TYPE', code: 'SEMI', code_nm: '반제품', sort_order: 2, use_yn: 'Y', create_by: 'SYSTEM', create_dt: new Date(), update_by: null, update_dt: new Date() },
  { group_cd: 'ITEM_TYPE', code: 'FIN', code_nm: '완제품', sort_order: 3, use_yn: 'Y', create_by: 'SYSTEM', create_dt: new Date(), update_by: null, update_dt: new Date() },
  { group_cd: 'UNIT', code: 'EA', code_nm: '개', sort_order: 1, use_yn: 'Y', create_by: 'SYSTEM', create_dt: new Date(), update_by: null, update_dt: new Date() },
];

describe('commonCodeService', () => {
  beforeEach(() => {
    invalidateCodeCache();
    vi.mocked(prisma.tbCommonCodeGrp.findMany).mockResolvedValue(mockGroups as any);
    vi.mocked(prisma.tbCommonCode.findMany).mockResolvedValue(mockCodes as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCodeGroups', () => {
    it('returns all active code groups', async () => {
      const groups = await getCodeGroups();
      expect(groups).toHaveLength(2);
      expect(groups[0].group_cd).toBe('ITEM_TYPE');
      expect(groups[1].group_cd).toBe('UNIT');
    });

    it('caches results across calls', async () => {
      await getCodeGroups();
      await getCodeGroups();
      // DB should only be queried once
      expect(prisma.tbCommonCodeGrp.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCodesByGroup', () => {
    it('returns codes for ITEM_TYPE group', async () => {
      const codes = await getCodesByGroup('ITEM_TYPE');
      expect(codes).toHaveLength(3);
      expect(codes.map((c) => c.code)).toEqual(['RAW', 'SEMI', 'FIN']);
    });

    it('returns empty array for unknown group', async () => {
      const codes = await getCodesByGroup('UNKNOWN_GROUP');
      expect(codes).toEqual([]);
    });

    it('returns codes for UNIT group', async () => {
      const codes = await getCodesByGroup('UNIT');
      expect(codes).toHaveLength(1);
      expect(codes[0].code).toBe('EA');
    });
  });

  describe('invalidateCodeCache', () => {
    it('forces cache refresh on next call', async () => {
      await getCodeGroups();
      expect(prisma.tbCommonCodeGrp.findMany).toHaveBeenCalledTimes(1);

      invalidateCodeCache();
      await getCodeGroups();
      expect(prisma.tbCommonCodeGrp.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache TTL', () => {
    it('refreshes cache after TTL expires', async () => {
      await getCodeGroups();
      expect(prisma.tbCommonCodeGrp.findMany).toHaveBeenCalledTimes(1);

      // Fast-forward past TTL
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes > 5 min TTL

      await getCodeGroups();
      expect(prisma.tbCommonCodeGrp.findMany).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
