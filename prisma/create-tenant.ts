/**
 * 신규 고객사(테넌트) 온보딩 스크립트 (멀티테넌시 스펙 D-8)
 *
 * 생성 내용:
 *   1. tb_company 회사 행
 *   2. tb_numbering 채번 규칙 11종 (회사별 독립 시퀀스, last_seq=0)
 *   3. 사용자 계정 (역할 MES_USER — 시스템관리 제외 전 메뉴 CRUD)
 *
 * 멱등(upsert) — 재실행해도 안전. 비밀번호는 이미 존재하는 사용자는 덮어쓰지 않는다.
 *
 * 사용법:
 *   TENANT_CD='ABC' TENANT_NM='회사명' \
 *   TENANT_USERS='[{"login_id":"abc_user1","user_nm":"홍길동","password":"초기비밀번호"}]' \
 *     npx tsx --env-file=.env prisma/create-tenant.ts
 */
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

// seed.ts의 채번 규칙과 동일 (포맷 변경 금지 — 기존 회사와 동일 체계)
const numberingRules = [
  { num_type: 'ITEM', prefix: 'RM', date_format: '', seq_length: 4 },
  { num_type: 'PROD_PLAN', prefix: 'PP', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'WORK_ORDER', prefix: 'WO', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'LOT', prefix: '', date_format: 'YYMMDD', seq_length: 3 },
  { num_type: 'INSPECTION', prefix: 'QC', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'SHIPPING', prefix: 'SH', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'DEFECT', prefix: 'DF', date_format: 'YYYYMMDD', seq_length: 4 },
  { num_type: 'MAINTENANCE', prefix: 'MT', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'ISSUE', prefix: 'IS', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'INCOMING', prefix: 'IC', date_format: 'YYYYMMDD', seq_length: 3 },
  { num_type: 'DEMAND', prefix: 'DM', date_format: 'YYMMDD', seq_length: 4 },
];

interface TenantUser { login_id: string; user_nm: string; password: string }

// 시스템 예약 회사코드 — 감사로그 SYSTEM 파티션 등과 충돌 방지
const RESERVED_CODES = new Set(['SYSTEM', 'FOODLY01']);

async function main() {
  const cd = process.env.TENANT_CD;
  const nm = process.env.TENANT_NM;
  const usersJson = process.env.TENANT_USERS ?? '[]';
  // 기본 공장/창고 (작업지시는 plant_cd 필수 → 온보딩에서 생성해야 신규 회사가 바로 사용 가능)
  const plantCd = process.env.TENANT_PLANT_CD ?? `${cd}_P1`;
  const plantNm = process.env.TENANT_PLANT_NM ?? `${nm} 공장`;
  const whCd = process.env.TENANT_WH_CD ?? `${cd}_WH1`;
  const whNm = process.env.TENANT_WH_NM ?? `${nm} 창고`;

  if (!cd || !nm) throw new Error('TENANT_CD / TENANT_NM 환경변수가 필요합니다.');
  if (RESERVED_CODES.has(cd.toUpperCase())) {
    throw new Error(`'${cd}'는 예약된 회사코드입니다. 다른 코드를 사용하세요.`);
  }
  const users: TenantUser[] = JSON.parse(usersJson);
  if (users.length === 0) {
    throw new Error('TENANT_USERS에 최소 1명의 초기 사용자가 필요합니다 (로그인 불가 회사 생성 방지).');
  }
  for (const u of users) {
    if (!u.login_id || !u.user_nm || !u.password || u.password.length < 8) {
      throw new Error(`사용자 항목이 불완전합니다 (비밀번호 최소 8자): ${u.login_id ?? '?'}`);
    }
  }
  // 사전 검증: 예약 계정·타사/무소속 계정 재사용 차단 (트랜잭션 밖에서 미리)
  for (const u of users) {
    if (u.login_id === 'admin') throw new Error("'admin'은 플랫폼 운영자 예약 계정입니다.");
    const existing = await prisma.tbUser.findUnique({ where: { login_id: u.login_id } });
    if (existing && existing.company_cd !== cd) {
      throw new Error(`login_id '${u.login_id}'는 이미 사용 중입니다 (소속: ${existing.company_cd ?? '무소속/관리자'}).`);
    }
  }

  // 전체 프로비저닝을 단일 트랜잭션으로 — 중간 실패 시 부분 생성 방지
  await prisma.$transaction(async (tx) => {
    await tx.tbCompany.upsert({
      where: { company_cd: cd },
      update: { company_nm: nm },
      create: { company_cd: cd, company_nm: nm, create_by: 'create-tenant' },
    });

    await tx.tbPlant.upsert({
      where: { plant_cd: plantCd },
      update: { plant_nm: plantNm, company_cd: cd },
      create: { plant_cd: plantCd, company_cd: cd, plant_nm: plantNm, create_by: 'create-tenant' },
    });
    await tx.tbWarehouse.upsert({
      where: { wh_cd: whCd },
      update: { wh_nm: whNm, company_cd: cd },
      create: { wh_cd: whCd, company_cd: cd, wh_nm: whNm, wh_type: 'FIN_WH', plant_cd: plantCd, create_by: 'create-tenant' },
    });

    for (const r of numberingRules) {
      await tx.tbNumbering.upsert({
        where: { company_cd_num_type: { company_cd: cd, num_type: r.num_type } },
        update: {}, // 기존 시퀀스 보존
        create: { company_cd: cd, ...r, last_seq: 0 },
      });
    }

    for (const u of users) {
      const existing = await tx.tbUser.findUnique({ where: { login_id: u.login_id } });
      const hashed = await bcrypt.hash(u.password, 10);
      await tx.tbUser.upsert({
        where: { login_id: u.login_id },
        update: { user_nm: u.user_nm, company_cd: cd, role_cd: 'MES_USER', status: 'ACTIVE' },
        create: {
          login_id: u.login_id, user_nm: u.user_nm, password: hashed,
          company_cd: cd, role_cd: 'MES_USER', status: 'ACTIVE', create_by: 'create-tenant',
        },
      });
      console.log(`  · 사용자 ${u.login_id} (${u.user_nm})${existing ? ' [기존 비밀번호 유지]' : ''}`);
    }
  }, { timeout: 60_000 });

  console.log(`✅ 회사 ${cd} (${nm}) + 공장 ${plantCd} + 창고 ${whCd} + 채번 ${numberingRules.length}종 + 사용자 ${users.length}명`);
  console.log(`\n온보딩 완료. ${users[0].login_id} 계정으로 로그인 → 품목/BOM 등 기준정보 입력 → 작업지시 생성 순서로 사용하세요.`);
}

main()
  .catch((e) => { console.error('❌ 온보딩 실패:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
