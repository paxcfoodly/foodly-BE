/**
 * 멀티테넌시 백필 스크립트 (Migration A 이후, Migration B 이전에 실행)
 *
 * 기존 단일 회사 데이터 전체를 지정한 회사 코드로 귀속시킨다.
 * 고객사 코드는 하드코딩하지 않고 env로만 받는다 (스펙 D-3).
 *
 * 사용법:
 *   BACKFILL_COMPANY_CD='XXX' BACKFILL_COMPANY_NM='회사명' \
 *     npx tsx --env-file=.env prisma/backfill-tenant.ts
 *
 * 수행 내용 (스펙 D-4 사용자 매핑 포함):
 *   1. tb_company에 대상 회사 upsert
 *   2. 49개 테넌트 대상 테이블의 company_cd IS NULL 행 전부 귀속
 *   3. tb_plant → 대상 회사로 이관, 데모 회사(FOODLY01) 행 삭제
 *   4. 사용자: admin은 null 유지(플랫폼 운영자), testuser 삭제,
 *      나머지 전원 대상 회사 귀속 + SYS_ADMIN이던 실사용자는 MES_USER로 강등
 */
import prisma from '../src/config/database';

// 스펙 D-1의 TENANT_MODELS와 1:1 — 테이블명 화이트리스트 ($executeRawUnsafe 보호)
const TENANT_TABLES = [
  // 기준정보 13
  'tb_workshop', 'tb_item', 'tb_bom', 'tb_process', 'tb_routing', 'tb_equipment',
  'tb_equip_process', 'tb_mold', 'tb_worker', 'tb_worker_skill', 'tb_customer',
  'tb_inspect_std', 'tb_warehouse',
  // 트랜잭션 27
  'tb_demand', 'tb_prod_plan', 'tb_work_order', 'tb_wo_process', 'tb_wo_worker',
  'tb_prod_result', 'tb_lot', 'tb_lot_history', 'tb_material_input', 'tb_material_issue',
  'tb_material_issue_dtl', 'tb_inspect_result', 'tb_inspect_result_dtl', 'tb_defect',
  'tb_defect_dispose', 'tb_equip_status', 'tb_maint_plan', 'tb_maint_plan_dtl',
  'tb_maint_result', 'tb_maint_result_dtl', 'tb_inventory', 'tb_inventory_tx',
  'tb_inventory_adjust', 'tb_shipment', 'tb_shipment_dtl', 'tb_incoming', 'tb_incoming_dtl',
  // 시스템 9
  'tb_numbering', 'tb_file', 'tb_audit_log', 'tb_notification', 'tb_noti_rule',
  'tb_batch_log', 'tb_notice', 'tb_sys_setting', 'tb_data_history',
];

const DEMO_COMPANY_CD = 'FOODLY01';

async function main() {
  const companyCd = process.env.BACKFILL_COMPANY_CD;
  const companyNm = process.env.BACKFILL_COMPANY_NM;
  if (!companyCd || !companyNm) {
    throw new Error('BACKFILL_COMPANY_CD / BACKFILL_COMPANY_NM 환경변수가 필요합니다.');
  }
  if (TENANT_TABLES.length !== 49) {
    throw new Error(`TENANT_TABLES는 49개여야 합니다 (현재 ${TENANT_TABLES.length})`);
  }

  await prisma.$transaction(async (tx) => {
    // 1. 대상 회사 생성
    await tx.tbCompany.upsert({
      where: { company_cd: companyCd },
      update: { company_nm: companyNm },
      create: { company_cd: companyCd, company_nm: companyNm, create_by: 'backfill' },
    });

    // 2. 49개 테이블 백필 (NULL 행만 — 멱등)
    for (const table of TENANT_TABLES) {
      const n = await tx.$executeRawUnsafe(
        `UPDATE "${table}" SET company_cd = $1 WHERE company_cd IS NULL`, companyCd,
      );
      if (n > 0) console.log(`  ${table}: ${n}행 귀속`);
    }

    // 3. plant 이관 + 데모 회사 정리
    await tx.tbPlant.updateMany({ where: {}, data: { company_cd: companyCd } });
    await tx.tbCompany.deleteMany({
      where: { company_cd: DEMO_COMPANY_CD, NOT: { company_cd: companyCd } },
    });

    // 4. 사용자 매핑 (스펙 D-4)
    await tx.tbUser.deleteMany({ where: { login_id: 'testuser' } });
    await tx.tbUser.updateMany({
      where: { login_id: { not: 'admin' } },
      data: { company_cd: companyCd },
    });
    // admin 외 SYS_ADMIN 실사용자는 MES_USER로 (플랫폼 운영자는 admin 1명뿐)
    await tx.tbUser.updateMany({
      where: { login_id: { not: 'admin' }, role_cd: 'SYS_ADMIN' },
      data: { role_cd: 'MES_USER' },
    });
  }, { timeout: 120_000 });

  // 검증: NULL 잔존 행 확인
  let remaining = 0;
  for (const table of TENANT_TABLES) {
    const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT count(*)::bigint AS c FROM "${table}" WHERE company_cd IS NULL`,
    );
    remaining += Number(rows[0].c);
  }
  if (remaining > 0) throw new Error(`백필 후 NULL 행 ${remaining}건 잔존 — Migration B 진행 금지`);
  console.log(`✅ 백필 완료: 전 테이블 company_cd='${companyCd}', NULL 잔존 0건`);
}

main()
  .catch((e) => { console.error('❌ 백필 실패:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
