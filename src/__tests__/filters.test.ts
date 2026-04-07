import { describe, it, expect } from 'vitest';
import { parseFilters } from '../utils/filters';

function mockReq(query: Record<string, unknown>) {
  return { query } as any;
}

describe('parseFilters', () => {
  it('returns empty object when no filter param', () => {
    expect(parseFilters(mockReq({}))).toEqual({});
  });

  it('parses contains operator', () => {
    const result = parseFilters(mockReq({ filter: { name: 'contains:food' } }));
    expect(result).toEqual({ name: { contains: 'food', mode: 'insensitive' } });
  });

  it('parses equals operator', () => {
    const result = parseFilters(mockReq({ filter: { status: 'equals:ACTIVE' } }));
    expect(result).toEqual({ status: 'ACTIVE' });
  });

  it('parses gte/lte operators with numbers', () => {
    const result = parseFilters(mockReq({ filter: { qty: 'gte:10' } }));
    expect(result).toEqual({ qty: { gte: 10 } });
  });

  it('parses in operator', () => {
    const result = parseFilters(mockReq({ filter: { status: 'in:ACTIVE,INACTIVE' } }));
    expect(result).toEqual({ status: { in: ['ACTIVE', 'INACTIVE'] } });
  });

  it('defaults to contains when no operator', () => {
    const result = parseFilters(mockReq({ filter: { name: 'keyword' } }));
    expect(result).toEqual({ name: { contains: 'keyword', mode: 'insensitive' } });
  });

  it('filters by allowed fields', () => {
    const result = parseFilters(
      mockReq({ filter: { name: 'test', secret: 'hack' } }),
      ['name'],
    );
    expect(result).toHaveProperty('name');
    expect(result).not.toHaveProperty('secret');
  });
});
