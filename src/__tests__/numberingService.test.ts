import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the service
const mockQueryRawUnsafe = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../config/database', () => {
  return {
    default: {
      $transaction: (fn: (tx: any) => Promise<any>) => {
        const tx = { $queryRawUnsafe: mockQueryRawUnsafe };
        return fn(tx);
      },
    },
  };
});

import { generateNumber } from '../services/numberingService';

describe('generateNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates WO number with correct format', async () => {
    // Mock SELECT FOR UPDATE
    mockQueryRawUnsafe
      .mockResolvedValueOnce([
        {
          num_type: 'WO',
          prefix: 'WO',
          date_format: 'YYYYMMDD',
          seq_length: 4,
          last_seq: 0,
          update_dt: new Date(),
        },
      ])
      // Mock UPDATE
      .mockResolvedValueOnce(undefined);

    const result = await generateNumber('WO');

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    expect(result).toBe(`WO-${y}${m}${d}-0001`);
  });

  it('increments sequence correctly', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([
        {
          num_type: 'WO',
          prefix: 'WO',
          date_format: 'YYYYMMDD',
          seq_length: 4,
          last_seq: 42,
          update_dt: new Date(),
        },
      ])
      .mockResolvedValueOnce(undefined);

    const result = await generateNumber('WO');
    expect(result).toMatch(/^WO-\d{8}-0043$/);
  });

  it('throws when num_type not found', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([]);
    await expect(generateNumber('UNKNOWN')).rejects.toThrow('채번 규칙을 찾을 수 없습니다');
  });

  it('concurrent calls produce unique sequential numbers', async () => {
    let seq = 0;
    mockQueryRawUnsafe.mockImplementation(async (sql: string, ...args: any[]) => {
      if (sql.includes('SELECT')) {
        seq++;
        return [
          {
            num_type: 'WO',
            prefix: 'WO',
            date_format: 'YYYYMMDD',
            seq_length: 4,
            last_seq: seq - 1,
            update_dt: new Date(),
          },
        ];
      }
      return undefined;
    });

    const results = await Promise.all([
      generateNumber('WO'),
      generateNumber('WO'),
      generateNumber('WO'),
    ]);

    // All three should be unique
    const unique = new Set(results);
    expect(unique.size).toBe(3);
  });

  it('pads sequence to configured length', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([
        {
          num_type: 'PP',
          prefix: 'PP',
          date_format: 'YYMMDD',
          seq_length: 3,
          last_seq: 5,
          update_dt: new Date(),
        },
      ])
      .mockResolvedValueOnce(undefined);

    const result = await generateNumber('PP');
    // seq_length=3, so sequence part should be '006'
    expect(result).toMatch(/-006$/);
  });
});
