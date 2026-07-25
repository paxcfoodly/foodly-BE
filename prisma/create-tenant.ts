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

async function main() {
  const cd = process.env.TENANT_CD;
  const nm = process.env.TENANT_NM;
  const usersJson = process.env.TENANT_USERS ?? '[]';
  if (!cd || !nm) throw new Error('TENANT_CD / TENANT_NM 환경변수가 필요합니다.');
  const users: TenantUser[] = JSON.parse(usersJson);
  for (const u of users) {
    if (!u.login_id || !u.user_nm || !u.password || u.password.length < 8) {
      throw new Error(`사용자 항목이 불완전합니다 (비밀번호 최소 8자): ${u.login_id ?? '?'}`);
    }
  }

  await prisma.tbCompany.upsert({
    where: { company_cd: cd },
    update: { company_nm: nm },
    create: { company_cd: cd, company_nm: nm, create_by: 'create-tenant' },
  });
  console.log(`✅ 회사: ${cd} (${nm})`);

  for (const r of numberingRules) {
    await prisma.tbNumbering.upsert({
      where: { company_cd_num_type: { company_cd: cd, num_type: r.num_type } },
      update: {}, // 기존 시퀀스 보존
      create: { company_cd: cd, ...r, last_seq: 0 },
    });
  }
  console.log(`✅ 채번 규칙 ${numberingRules.length}종`);

  for (const u of users) {
    const existing = await prisma.tbUser.findUnique({ where: { login_id: u.login_id } });
    if (existing && existing.company_cd && existing.company_cd !== cd) {
      throw new Error(`login_id '${u.login_id}'는 이미 다른 회사(${existing.company_cd}) 소속입니다.`);
    }
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.tbUser.upsert({
      where: { login_id: u.login_id },
      update: { user_nm: u.user_nm, company_cd: cd, role_cd: 'MES_USER', status: 'ACTIVE' },
      create: {
        login_id: u.login_id,
        user_nm: u.user_nm,
        password: hashed,
        company_cd: cd,
        role_cd: 'MES_USER',
        status: 'ACTIVE',
        create_by: 'create-tenant',
      },
    });
    console.log(`✅ 사용자: ${u.login_id} (${u.user_nm}) — MES_USER${existing ? ' [기존 비밀번호 유지]' : ''}`);
  }

  console.log(`\n온보딩 완료. ${cd} 사용자로 로그인 → 기준정보 입력 → 작업지시 생성 순서로 확인하세요.`);
}

main()
  .catch((e) => { console.error('❌ 온보딩 실패:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
