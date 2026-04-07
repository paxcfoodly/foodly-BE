import { Request } from 'express';

type FilterOperator = 'contains' | 'equals' | 'gte' | 'lte' | 'in';

interface RawFilter {
  field: string;
  op: FilterOperator;
  value: string;
}

const VALID_OPS: ReadonlySet<string> = new Set<FilterOperator>([
  'contains',
  'equals',
  'gte',
  'lte',
  'in',
]);

/**
 * Parse filter parameters from request query into Prisma where conditions.
 *
 * Query format:
 *   ?filter[field1]=contains:value
 *   ?filter[field2]=equals:value
 *   ?filter[field3]=gte:10
 *   ?filter[field4]=lte:100
 *   ?filter[field5]=in:a,b,c
 *   ?filter[field6]=value          (shorthand → contains for strings)
 *
 * Returns a Prisma-compatible `where` object.
 */
export function parseFilters(
  req: Request,
  allowedFields?: string[],
): Record<string, unknown> {
  const filterQuery = req.query.filter;
  if (!filterQuery || typeof filterQuery !== 'object') return {};

  const where: Record<string, unknown> = {};

  for (const [field, rawValue] of Object.entries(filterQuery as Record<string, string>)) {
    if (!rawValue || typeof rawValue !== 'string') continue;
    if (allowedFields && !allowedFields.includes(field)) continue;

    const parsed = parseFilterValue(rawValue);
    if (!parsed) continue;

    where[field] = buildPrismaCondition(parsed.op, parsed.value);
  }

  return where;
}

function parseFilterValue(raw: string): { op: FilterOperator; value: string } | null {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) {
    // No operator prefix → default to contains
    return { op: 'contains', value: raw };
  }

  const maybeOp = raw.substring(0, colonIdx);
  const value = raw.substring(colonIdx + 1);

  if (VALID_OPS.has(maybeOp)) {
    return { op: maybeOp as FilterOperator, value };
  }

  // Colon present but not a valid operator → treat entire string as contains value
  return { op: 'contains', value: raw };
}

function buildPrismaCondition(op: FilterOperator, value: string): unknown {
  switch (op) {
    case 'contains':
      return { contains: value, mode: 'insensitive' };
    case 'equals':
      return value;
    case 'gte': {
      const num = Number(value);
      return { gte: Number.isFinite(num) ? num : value };
    }
    case 'lte': {
      const num = Number(value);
      return { lte: Number.isFinite(num) ? num : value };
    }
    case 'in':
      return { in: value.split(',').map((v) => v.trim()).filter(Boolean) };
    default:
      return { contains: value, mode: 'insensitive' };
  }
}
