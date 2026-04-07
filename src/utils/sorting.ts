import { Request } from 'express';

type SortDirection = 'asc' | 'desc';

/**
 * Parse sort parameters from request query into a Prisma orderBy array.
 *
 * Accepts:
 *   ?sort=field1:asc,field2:desc
 *   ?sort=field1              (defaults to asc)
 *
 * Returns [] when no valid sort parameters are found (caller should apply its own default).
 */
export function parseSort(
  req: Request,
  allowedFields?: string[],
): Array<Record<string, SortDirection>> {
  const raw = req.query.sort;
  if (typeof raw !== 'string' || raw.trim() === '') return [];

  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const result: Array<Record<string, SortDirection>> = [];

  for (const part of parts) {
    const [field, dir] = part.split(':');
    if (!field) continue;

    // Whitelist check
    if (allowedFields && !allowedFields.includes(field)) continue;

    const direction: SortDirection = dir === 'desc' ? 'desc' : 'asc';
    result.push({ [field]: direction });
  }

  return result;
}
