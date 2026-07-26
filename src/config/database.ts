import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppError } from '../middlewares/errorHandler';
import { getTenantContext } from '../middlewares/tenantContext';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg(connectionString);

const basePrisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ─────────────────────────────────────────────────────────────
// 멀티테넌시 자동 필터 (스펙 D-1/D-6)
// 테넌트 대상 49개 모델 화이트리스트 — schema.prisma와 1:1 유지
// ─────────────────────────────────────────────────────────────
export const TENANT_MODELS = new Set([
  // 공장 — company_cd 보유. 격리 대상에 포함 (타사 plant_cd 참조 차단)
  'TbPlant',
  // 기준정보 13
  'TbWorkshop', 'TbItem', 'TbBom', 'TbProcess', 'TbRouting', 'TbEquipment',
  'TbEquipProcess', 'TbMold', 'TbWorker', 'TbWorkerSkill', 'TbCustomer',
  'TbInspectStd', 'TbWarehouse',
  // 트랜잭션 27
  'TbDemand', 'TbProdPlan', 'TbWorkOrder', 'TbWoProcess', 'TbWoWorker',
  'TbProdResult', 'TbLot', 'TbLotHistory', 'TbMaterialInput', 'TbMaterialIssue',
  'TbMaterialIssueDtl', 'TbInspectResult', 'TbInspectResultDtl', 'TbDefect',
  'TbDefectDispose', 'TbEquipStatus', 'TbMaintPlan', 'TbMaintPlanDtl',
  'TbMaintResult', 'TbMaintResultDtl', 'TbInventory', 'TbInventoryTx',
  'TbInventoryAdjust', 'TbShipment', 'TbShipmentDtl', 'TbIncoming', 'TbIncomingDtl',
  // 시스템 9
  'TbNumbering', 'TbFile', 'TbAuditLog', 'TbNotification', 'TbNotiRule',
  'TbBatchLog', 'TbNotice', 'TbSysSetting', 'TbDataHistory',
]);

const READ_WHERE_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy',
  'updateMany', 'deleteMany', 'updateManyAndReturn',
]);
const UNIQUE_READ_OPS = new Set(['findUnique', 'findUniqueOrThrow']);
const UNIQUE_WRITE_OPS = new Set(['update', 'delete', 'upsert']);
const CREATE_OPS = new Set(['create', 'createMany', 'createManyAndReturn']);
// 확장이 명시적으로 처리하는 전체 연산 — 이 목록에 없는 연산은 fail-closed
const HANDLED_OPS = new Set([
  ...READ_WHERE_OPS, ...UNIQUE_READ_OPS, ...UNIQUE_WRITE_OPS, ...CREATE_OPS,
]);

/** 쓰기 시 강제할 회사코드. 일반 사용자=소속사, SYS_ADMIN=X-Company-Cd 헤더(D-14). */
function resolveWriteCompanyCd(): string | null {
  const ctx = getTenantContext();
  if (!ctx) return null; // 시스템 컨텍스트 (시드/스크립트) — 호출부가 직접 지정
  if (ctx.bypass) {
    if (!ctx.adminWriteCompanyCd) {
      throw new AppError('관리자 쓰기에는 X-Company-Cd 헤더로 대상 회사를 지정해야 합니다.', 400);
    }
    return ctx.adminWriteCompanyCd;
  }
  return ctx.companyCd;
}

/** 조회 필터에 쓸 회사코드. null이면 필터 미적용(bypass/시스템). */
function resolveReadCompanyCd(): string | null {
  const ctx = getTenantContext();
  if (!ctx || ctx.bypass) return null;
  return ctx.companyCd;
}

function injectWhere(args: any, companyCd: string): any {
  return { ...args, where: { AND: [args?.where ?? {}, { company_cd: companyCd }] } };
}

function forceCompanyOnData(data: any, companyCd: string): any {
  if (Array.isArray(data)) return data.map((d) => ({ ...d, company_cd: companyCd }));
  return { ...data, company_cd: companyCd };
}

const prisma = basePrisma.$extends({
  name: 'tenantIsolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) return query(args);

        // ── 조회/일괄 쓰기: where 주입 ──
        if (READ_WHERE_OPS.has(operation)) {
          const cd = resolveReadCompanyCd();
          if (operation === 'updateMany') {
            const writeCd = resolveWriteCompanyCd();
            let a = args as any;
            if (writeCd) a = injectWhere(a, writeCd);
            return query(a);
          }
          if (operation === 'deleteMany') {
            const writeCd = resolveWriteCompanyCd();
            return query(writeCd ? injectWhere(args, writeCd) : args);
          }
          return query(cd ? injectWhere(args, cd) : args);
        }

        // ── 단건 조회: 실행 후 소유 검증 (unique where에는 필터 주입 불가) ──
        if (UNIQUE_READ_OPS.has(operation)) {
          const cd = resolveReadCompanyCd();
          const result: any = await query(args);
          if (cd && result && result.company_cd !== cd) {
            if (operation === 'findUniqueOrThrow') {
              throw new AppError('데이터를 찾을 수 없습니다.', 404);
            }
            return null;
          }
          return result;
        }

        // ── 생성: company_cd 강제 (클라이언트 값 무시, D-6/D-14) ──
        if (CREATE_OPS.has(operation)) {
          const ctx = getTenantContext();
          // bypass(SYS_ADMIN)·시스템 컨텍스트: 서비스가 명시한 company_cd를 존중 (감사로그 등)
          if (!ctx || ctx.bypass) {
            const data: any = (args as any).data;
            const hasExplicit = Array.isArray(data)
              ? data.every((d) => d.company_cd)
              : Boolean(data?.company_cd);
            if (hasExplicit || !ctx) return query(args);
          }
          const cd = resolveWriteCompanyCd();
          if (!cd) return query(args); // 시스템 컨텍스트
          const a: any = { ...args, data: forceCompanyOnData((args as any).data, cd) };
          return query(a);
        }

        // ── 단건 수정/삭제/upsert: 사전 소유 검증 (교차 테넌트 = 404, D-7) ──
        if (UNIQUE_WRITE_OPS.has(operation)) {
          const cd = resolveWriteCompanyCd();
          if (!cd) return query(args); // 시스템 컨텍스트
          const delegate = (basePrisma as any)[model.charAt(0).toLowerCase() + model.slice(1)];
          const existing = await delegate.findUnique({
            where: (args as any).where,
            select: { company_cd: true },
          });
          if (existing && existing.company_cd !== cd) {
            throw new AppError('데이터를 찾을 수 없습니다.', 404);
          }
          if (operation === 'upsert') {
            const a: any = { ...args, create: forceCompanyOnData((args as any).create, cd) };
            return query(a);
          }
          if ((operation === 'update' || operation === 'delete') && !existing) {
            // 존재하지 않는 행 — 원래 P2025가 나가도록 그대로 실행
            return query(args);
          }
          return query(args);
        }

        // ── 미처리 연산: fail-closed (필터 없이 전 테넌트에 실행되는 것을 차단) ──
        if (!HANDLED_OPS.has(operation)) {
          throw new AppError(
            `테넌트 격리 미지원 연산(${operation})입니다. 확장에 처리를 추가해야 합니다.`,
            500,
          );
        }

        return query(args);
      },
    },
  },
});

export { basePrisma };
export default prisma;
