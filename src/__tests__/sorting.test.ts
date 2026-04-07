import { describe, it, expect } from 'vitest';
import { parseSort } from '../utils/sorting';

function mockReq(query: Record<string, unknown>) {
  return { query } as any;
}

describe('parseSort', () => {
  it('returns empty array when no sort param', () => {
    expect(parseSort(mockReq({}))).toEqual([]);
  });

  it('parses single field with direction', () => {
    const result = parseSort(mockReq({ sort: 'name:desc' }));
    expect(result).toEqual([{ name: 'desc' }]);
  });

  it('defaults to asc when no direction', () => {
    const result = parseSort(mockReq({ sort: 'name' }));
    expect(result).toEqual([{ name: 'asc' }]);
  });

  it('parses multiple fields', () => {
    const result = parseSort(mockReq({ sort: 'status:desc,create_dt:asc' }));
    expect(result).toEqual([
      { status: 'desc' },
      { create_dt: 'asc' },
    ]);
  });

  it('filters by allowed fields', () => {
    const result = parseSort(mockReq({ sort: 'name:asc,secret:desc' }), ['name']);
    expect(result).toEqual([{ name: 'asc' }]);
  });

  it('returns empty for empty string', () => {
    expect(parseSort(mockReq({ sort: '' }))).toEqual([]);
  });
});
