import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';

function mockReq(query: Record<string, unknown>) {
  return { query } as any;
}

describe('parsePagination', () => {
  it('returns defaults when no query params', () => {
    const result = parsePagination(mockReq({}));
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('parses valid page and limit', () => {
    const result = parsePagination(mockReq({ page: '3', limit: '10' }));
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('clamps limit to MAX_LIMIT=100', () => {
    const result = parsePagination(mockReq({ page: '1', limit: '500' }));
    expect(result.limit).toBe(100);
  });

  it('defaults negative values', () => {
    const result = parsePagination(mockReq({ page: '-1', limit: '-5' }));
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('handles NaN gracefully', () => {
    const result = parsePagination(mockReq({ page: 'abc', limit: 'xyz' }));
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });
});

describe('buildPaginatedResponse', () => {
  it('builds correct envelope', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildPaginatedResponse(items, 50, 2, 10);
    expect(result.data).toEqual(items);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 50,
      totalPages: 5,
    });
  });

  it('totalPages is 1 when total is 0', () => {
    const result = buildPaginatedResponse([], 0, 1, 20);
    expect(result.pagination.totalPages).toBe(1);
  });
});
