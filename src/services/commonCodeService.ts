import prisma from '../config/database';

/**
 * In-memory cache for common codes.
 * Key: group_cd → array of code entries.
 * TTL-based invalidation: cache refreshes every CACHE_TTL_MS.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CodeEntry {
  group_cd: string;
  code: string;
  code_nm: string;
  sort_order: number;
  use_yn: string;
}

interface GroupEntry {
  group_cd: string;
  group_nm: string;
  use_yn: string;
}

let codeCache: Map<string, CodeEntry[]> | null = null;
let groupCache: GroupEntry[] | null = null;
let cacheTimestamp = 0;

function isCacheValid(): boolean {
  return codeCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

async function refreshCache(): Promise<void> {
  const [groups, codes] = await Promise.all([
    prisma.tbCommonCodeGrp.findMany({
      where: { use_yn: 'Y' },
      orderBy: { group_cd: 'asc' },
    }),
    prisma.tbCommonCode.findMany({
      where: { use_yn: 'Y' },
      orderBy: [{ group_cd: 'asc' }, { sort_order: 'asc' }],
    }),
  ]);

  const newCodeCache = new Map<string, CodeEntry[]>();
  for (const code of codes) {
    const list = newCodeCache.get(code.group_cd) ?? [];
    list.push({
      group_cd: code.group_cd,
      code: code.code,
      code_nm: code.code_nm,
      sort_order: code.sort_order,
      use_yn: code.use_yn,
    });
    newCodeCache.set(code.group_cd, list);
  }

  groupCache = groups.map((g) => ({
    group_cd: g.group_cd,
    group_nm: g.group_nm,
    use_yn: g.use_yn,
  }));
  codeCache = newCodeCache;
  cacheTimestamp = Date.now();
}

/**
 * Get all code groups.
 */
export async function getCodeGroups(): Promise<GroupEntry[]> {
  if (!isCacheValid()) await refreshCache();
  return groupCache!;
}

/**
 * Get codes for a specific group.
 * Returns empty array if group not found.
 */
export async function getCodesByGroup(groupCd: string): Promise<CodeEntry[]> {
  if (!isCacheValid()) await refreshCache();
  return codeCache!.get(groupCd) ?? [];
}

/**
 * Invalidate cache manually (e.g. after admin updates codes).
 */
export function invalidateCodeCache(): void {
  codeCache = null;
  groupCache = null;
  cacheTimestamp = 0;
}

// Exported for testing
export { isCacheValid, refreshCache, CACHE_TTL_MS };
