import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

// ═══════════════════════════════════════════════════════════
// 1. 공통코드 그룹 + 상세코드 (proposal 5-5)
// ═══════════════════════════════════════════════════════════
const commonCodeGroups: { group_cd: string; group_nm: string; codes: { code: string; code_nm: string }[] }[] = [
  {
    group_cd: 'ITEM_TYPE', group_nm: '품목유형',
    codes: [
      { code: 'RAW', code_nm: '원자재' },
      { code: 'SEMI', code_nm: '반제품' },
      { code: 'FIN', code_nm: '완제품' },
    ],
  },
  {
    group_cd: 'UNIT', group_nm: '단위',
    codes: [
      { code: 'EA', code_nm: '개' },
      { code: 'KG', code_nm: '킬로그램' },
      { code: 'M', code_nm: '미터' },
      { code: 'L', code_nm: '리터' },
      { code: 'SET', code_nm: '세트' },
      { code: 'BOX', code_nm: '박스' },
    ],
  },
  {
    group_cd: 'PROC_TYPE', group_nm: '공정유형',
    codes: [
      { code: 'MACHINING', code_nm: '가공' },
      { code: 'ASSY', code_nm: '조립' },
      { code: 'INSP', code_nm: '검사' },
      { code: 'PKG', code_nm: '포장' },
    ],
  },
  {
    group_cd: 'EQUIP_TYPE', group_nm: '설비유형',
    codes: [
      { code: 'CNC', code_nm: 'CNC' },
      { code: 'PRESS', code_nm: '프레스' },
      { code: 'INJECTION', code_nm: '사출기' },
      { code: 'PACKAGING', code_nm: '포장기' },
    ],
  },
  {
    group_cd: 'DEFECT_TYPE', group_nm: '불량유형',
    codes: [
      { code: 'APPEARANCE', code_nm: '외관불량' },
      { code: 'DIMENSION', code_nm: '치수불량' },
      { code: 'FUNCTION', code_nm: '기능불량' },
      { code: 'PACKAGE', code_nm: '포장불량' },
    ],
  },
  {
    group_cd: 'DEFECT_CAUSE', group_nm: '불량원인',
    codes: [
      { code: 'MATERIAL', code_nm: '자재' },
      { code: 'MACHINE', code_nm: '설비' },
      { code: 'MAN', code_nm: '작업자' },
      { code: 'METHOD', code_nm: '방법' },
    ],
  },
  {
    group_cd: 'DOWN_REASON', group_nm: '비가동사유',
    codes: [
      { code: 'BREAKDOWN', code_nm: '고장' },
      { code: 'SETUP', code_nm: '셋업/전환' },
      { code: 'MATERIAL_WAIT', code_nm: '자재대기' },
      { code: 'PLANNED', code_nm: '계획정지' },
    ],
  },
  {
    group_cd: 'WO_STATUS', group_nm: '작업지시상태',
    codes: [
      { code: 'WAIT', code_nm: '대기' },
      { code: 'PROGRESS', code_nm: '진행' },
      { code: 'COMPLETE', code_nm: '완료' },
      { code: 'CLOSE', code_nm: '마감' },
      { code: 'CANCEL', code_nm: '취소' },
    ],
  },
  {
    group_cd: 'INSP_TYPE', group_nm: '검사유형',
    codes: [
      { code: 'INCOMING', code_nm: '수입검사' },
      { code: 'PROCESS', code_nm: '공정검사' },
      { code: 'SHIPPING', code_nm: '출하검사' },
    ],
  },
  {
    group_cd: 'JUDGE', group_nm: '합부판정',
    codes: [
      { code: 'PASS', code_nm: '합격' },
      { code: 'FAIL', code_nm: '불합격' },
      { code: 'CONDITIONAL', code_nm: '조건부합격' },
    ],
  },
  {
    group_cd: 'DISPOSE', group_nm: '불량처리',
    codes: [
      { code: 'REWORK', code_nm: '재작업' },
      { code: 'SCRAP', code_nm: '폐기' },
      { code: 'CONCESSION', code_nm: '특채' },
    ],
  },
  {
    group_cd: 'SHIFT', group_nm: '근무조',
    codes: [
      { code: 'A_SHIFT', code_nm: 'A조 (주간)' },
      { code: 'B_SHIFT', code_nm: 'B조 (야간)' },
      { code: 'C_SHIFT', code_nm: 'C조 (교대)' },
    ],
  },
  {
    group_cd: 'PRIORITY', group_nm: '우선순위',
    codes: [
      { code: 'URGENT', code_nm: '긴급' },
      { code: 'HIGH', code_nm: '높음' },
      { code: 'NORMAL', code_nm: '보통' },
      { code: 'LOW', code_nm: '낮음' },
    ],
  },
  {
    group_cd: 'MAINT_TYPE', group_nm: '보전유형',
    codes: [
      { code: 'DAILY', code_nm: '일상점검' },
      { code: 'PERIODIC', code_nm: '정기보전' },
      { code: 'PRECISION', code_nm: '정밀점검' },
      { code: 'BREAKDOWN', code_nm: '사후보전' },
    ],
  },
  {
    group_cd: 'WH_TYPE', group_nm: '창고유형',
    codes: [
      { code: 'RAW_WH', code_nm: '원자재 창고' },
      { code: 'WIP_WH', code_nm: '재공품 창고' },
      { code: 'FIN_WH', code_nm: '완제품 창고' },
      { code: 'QUARANTINE', code_nm: '격리 창고' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// 2. 역할 (proposal 3-3)
// ═══════════════════════════════════════════════════════════
const roles = [
  { role_cd: 'SYS_ADMIN', role_nm: '시스템 관리자', role_desc: '시스템 관리자 (IT팀)' },
  { role_cd: 'PLANT_MGR', role_nm: '공장장', role_desc: '공장장/생산관리팀장' },
  { role_cd: 'PROD_MGR', role_nm: '생산관리자', role_desc: '생산팀 관리자' },
  { role_cd: 'PROD_WORKER', role_nm: '생산작업자', role_desc: '생산 현장 작업자' },
  { role_cd: 'QC_MGR', role_nm: '품질관리자', role_desc: '품질관리 관리자' },
  { role_cd: 'QC_INSPECTOR', role_nm: '품질검사자', role_desc: '품질검사 실무자' },
  { role_cd: 'MAINT_MGR', role_nm: '설비보전관리자', role_desc: '설비보전 관리자' },
  { role_cd: 'MAINT_WORKER', role_nm: '설비보전작업자', role_desc: '설비보전 실무자' },
  { role_cd: 'MAT_MGR', role_nm: '자재관리자', role_desc: '자재/창고 관리자' },
  { role_cd: 'VIEWER', role_nm: '조회전용', role_desc: '조회 전용 (임원, 타부서)' },
];

// ═══════════════════════════════════════════════════════════
// 3. 메뉴 트리 (proposal 4-1)  — depth 1 = 대메뉴, 2 = 중메뉴, 3 = 소메뉴
// menu_id auto-increment; we use explicit IDs for FK reference
// ═══════════════════════════════════════════════════════════
interface MenuSeed {
  menu_id: number;
  parent_menu_id: number | null;
  menu_nm: string;
  menu_url: string | null;
  sort_order: number;
  depth: number;
}

const menus: MenuSeed[] = [
  // 1. 대시보드
  { menu_id: 1, parent_menu_id: null, menu_nm: '대시보드', menu_url: null, sort_order: 1, depth: 1 },
  { menu_id: 101, parent_menu_id: 1, menu_nm: '생산종합 대시보드', menu_url: '/dashboard/production', sort_order: 1, depth: 2 },
  { menu_id: 102, parent_menu_id: 1, menu_nm: '품질종합 대시보드', menu_url: '/dashboard/quality', sort_order: 2, depth: 2 },
  { menu_id: 103, parent_menu_id: 1, menu_nm: '설비종합 대시보드', menu_url: '/dashboard/equipment', sort_order: 3, depth: 2 },
  { menu_id: 104, parent_menu_id: 1, menu_nm: '현장 안돈 모드', menu_url: '/dashboard/andon', sort_order: 4, depth: 2 },

  // 2. 기준정보
  { menu_id: 2, parent_menu_id: null, menu_nm: '기준정보', menu_url: null, sort_order: 2, depth: 1 },
  { menu_id: 201, parent_menu_id: 2, menu_nm: '품목관리', menu_url: '/master/item', sort_order: 1, depth: 2 },
  { menu_id: 202, parent_menu_id: 2, menu_nm: 'BOM관리', menu_url: '/master/bom', sort_order: 2, depth: 2 },
  { menu_id: 203, parent_menu_id: 2, menu_nm: '공정관리', menu_url: '/master/process', sort_order: 3, depth: 2 },
  { menu_id: 204, parent_menu_id: 2, menu_nm: '설비관리', menu_url: '/master/equipment', sort_order: 4, depth: 2 },
  { menu_id: 205, parent_menu_id: 2, menu_nm: '작업장/라인 관리', menu_url: '/master/workshop', sort_order: 5, depth: 2 },
  { menu_id: 206, parent_menu_id: 2, menu_nm: '작업자관리', menu_url: '/master/worker', sort_order: 6, depth: 2 },
  { menu_id: 207, parent_menu_id: 2, menu_nm: '거래처관리', menu_url: '/master/partner', sort_order: 7, depth: 2 },
  { menu_id: 208, parent_menu_id: 2, menu_nm: '검사기준관리', menu_url: '/master/inspection', sort_order: 8, depth: 2 },

  // 3. 생산계획
  { menu_id: 3, parent_menu_id: null, menu_nm: '생산계획', menu_url: null, sort_order: 3, depth: 1 },
  { menu_id: 301, parent_menu_id: 3, menu_nm: '생산계획 관리', menu_url: '/plan/management', sort_order: 1, depth: 2 },
  { menu_id: 302, parent_menu_id: 3, menu_nm: '수요관리', menu_url: '/plan/demand', sort_order: 2, depth: 2 },

  // 4. 작업지시
  { menu_id: 4, parent_menu_id: null, menu_nm: '작업지시', menu_url: null, sort_order: 4, depth: 1 },
  { menu_id: 401, parent_menu_id: 4, menu_nm: '작업지시 관리', menu_url: '/work-order/management', sort_order: 1, depth: 2 },
  { menu_id: 402, parent_menu_id: 4, menu_nm: '작업배정', menu_url: '/work-order/assignment', sort_order: 2, depth: 2 },

  // 5. 생산실적
  { menu_id: 5, parent_menu_id: null, menu_nm: '생산실적', menu_url: null, sort_order: 5, depth: 1 },
  { menu_id: 501, parent_menu_id: 5, menu_nm: '실적관리', menu_url: '/result/manage', sort_order: 1, depth: 2 },
  { menu_id: 502, parent_menu_id: 5, menu_nm: '자재투입', menu_url: '/result/material', sort_order: 2, depth: 2 },
  { menu_id: 503, parent_menu_id: 5, menu_nm: 'LOT관리', menu_url: '/result/lot', sort_order: 3, depth: 2 },

  // 6. 품질관리
  { menu_id: 6, parent_menu_id: null, menu_nm: '품질관리', menu_url: null, sort_order: 6, depth: 1 },
  { menu_id: 601, parent_menu_id: 6, menu_nm: '수입검사', menu_url: '/quality/incoming', sort_order: 1, depth: 2 },
  { menu_id: 602, parent_menu_id: 6, menu_nm: '공정검사', menu_url: '/quality/process', sort_order: 2, depth: 2 },
  { menu_id: 603, parent_menu_id: 6, menu_nm: '출하검사', menu_url: '/quality/shipping', sort_order: 3, depth: 2 },
  { menu_id: 604, parent_menu_id: 6, menu_nm: '불량관리', menu_url: '/quality/defect', sort_order: 4, depth: 2 },
  { menu_id: 605, parent_menu_id: 6, menu_nm: 'SPC', menu_url: '/quality/spc', sort_order: 5, depth: 2 },

  // 7. 설비보전
  { menu_id: 7, parent_menu_id: null, menu_nm: '설비보전', menu_url: null, sort_order: 7, depth: 1 },
  { menu_id: 701, parent_menu_id: 7, menu_nm: '설비가동관리', menu_url: '/maint/operation', sort_order: 1, depth: 2 },
  { menu_id: 702, parent_menu_id: 7, menu_nm: '예방보전', menu_url: '/maint/preventive', sort_order: 2, depth: 2 },
  { menu_id: 703, parent_menu_id: 7, menu_nm: '금형관리', menu_url: '/maint/mold', sort_order: 3, depth: 2 },

  // 8. 자재/재고
  { menu_id: 8, parent_menu_id: null, menu_nm: '자재/재고', menu_url: null, sort_order: 8, depth: 1 },
  { menu_id: 801, parent_menu_id: 8, menu_nm: '자재불출', menu_url: '/inventory/issue', sort_order: 1, depth: 2 },
  { menu_id: 802, parent_menu_id: 8, menu_nm: '재고관리', menu_url: '/inventory/stock', sort_order: 2, depth: 2 },
  { menu_id: 803, parent_menu_id: 8, menu_nm: '입고관리', menu_url: '/inventory/receive', sort_order: 3, depth: 2 },

  // 9. 출하관리
  { menu_id: 9, parent_menu_id: null, menu_nm: '출하관리', menu_url: null, sort_order: 9, depth: 1 },
  { menu_id: 901, parent_menu_id: 9, menu_nm: '출하지시', menu_url: '/shipment/order', sort_order: 1, depth: 2 },
  { menu_id: 902, parent_menu_id: 9, menu_nm: '출하처리', menu_url: '/shipment/process', sort_order: 2, depth: 2 },

  // 10. 리포트
  { menu_id: 10, parent_menu_id: null, menu_nm: '리포트', menu_url: null, sort_order: 10, depth: 1 },
  { menu_id: 1001, parent_menu_id: 10, menu_nm: '생산 리포트', menu_url: '/report/production', sort_order: 1, depth: 2 },
  { menu_id: 1002, parent_menu_id: 10, menu_nm: '품질 리포트', menu_url: '/report/quality', sort_order: 2, depth: 2 },
  { menu_id: 1003, parent_menu_id: 10, menu_nm: '설비 리포트', menu_url: '/report/equipment', sort_order: 3, depth: 2 },
  { menu_id: 1004, parent_menu_id: 10, menu_nm: '재고 리포트', menu_url: '/report/inventory', sort_order: 4, depth: 2 },
  { menu_id: 1005, parent_menu_id: 10, menu_nm: '종합 KPI', menu_url: '/report/kpi', sort_order: 5, depth: 2 },

  // 11. 시스템관리
  { menu_id: 11, parent_menu_id: null, menu_nm: '시스템관리', menu_url: null, sort_order: 11, depth: 1 },
  { menu_id: 1101, parent_menu_id: 11, menu_nm: '사용자관리', menu_url: '/system/user', sort_order: 1, depth: 2 },
  { menu_id: 1102, parent_menu_id: 11, menu_nm: '권한관리', menu_url: '/system/role', sort_order: 2, depth: 2 },
  { menu_id: 1103, parent_menu_id: 11, menu_nm: '공통코드관리', menu_url: '/system/code', sort_order: 3, depth: 2 },
  { menu_id: 1104, parent_menu_id: 11, menu_nm: '알림관리', menu_url: '/system/notification', sort_order: 4, depth: 2 },
  { menu_id: 1105, parent_menu_id: 11, menu_nm: '시스템 설정', menu_url: '/system/config', sort_order: 5, depth: 2 },
  { menu_id: 1106, parent_menu_id: 11, menu_nm: '로그관리', menu_url: '/system/log', sort_order: 6, depth: 2 },
  { menu_id: 1107, parent_menu_id: 11, menu_nm: '공지사항', menu_url: '/system/notice', sort_order: 7, depth: 2 },
];

// ═══════════════════════════════════════════════════════════
// 4. 역할-메뉴 권한 매트릭스 (proposal 3-3)
//    대메뉴 기준 매핑 → 대메뉴 + 하위메뉴 모두 동일 권한 부여
// ═══════════════════════════════════════════════════════════

// Map proposal menu groups to top-level menu_ids
type Perm = { C: string; R: string; U: string; D: string };
function perm(spec: string): Perm {
  return {
    C: spec.includes('C') ? 'Y' : 'N',
    R: spec.includes('R') ? 'Y' : 'N',
    U: spec.includes('U') ? 'Y' : 'N',
    D: spec.includes('D') ? 'Y' : 'N',
  };
}

// proposal 3-3 permission matrix by top-level menu_id
const permMatrix: Record<number, Record<string, string>> = {
  // 대시보드/리포트 — all R
  1:  { SYS_ADMIN: 'R', PLANT_MGR: 'R', PROD_MGR: 'R', PROD_WORKER: 'R', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 기준정보
  2:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: 'RU', PROD_WORKER: 'R', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 생산계획
  3:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'CRUD', PROD_MGR: 'CRUD', PROD_WORKER: 'R', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 작업지시
  4:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'CRUD', PROD_MGR: 'CRUD', PROD_WORKER: 'R', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 생산실적
  5:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: 'CRU', PROD_WORKER: 'CRU', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 품질관리 (includes 불량관리 under same top menu)
  6:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: 'R', PROD_WORKER: '', QC_MGR: 'CRUD', QC_INSPECTOR: 'CRUD', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 설비보전
  7:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: 'R', PROD_WORKER: 'R', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'CRUD', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 자재/재고
  8:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: 'R', PROD_WORKER: 'CR', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'CRUD', VIEWER: 'R' },
  // 출하관리 (mapped as 재고/출하 in proposal)
  9:  { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: 'R', PROD_WORKER: '', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'CRUD', VIEWER: 'R' },
  // 리포트
  10: { SYS_ADMIN: 'R', PLANT_MGR: 'R', PROD_MGR: 'R', PROD_WORKER: 'R', QC_MGR: 'R', QC_INSPECTOR: 'R', MAINT_MGR: 'R', MAINT_WORKER: 'R', MAT_MGR: 'R', VIEWER: 'R' },
  // 시스템관리
  11: { SYS_ADMIN: 'CRUD', PLANT_MGR: 'R', PROD_MGR: '', PROD_WORKER: '', QC_MGR: '', QC_INSPECTOR: '', MAINT_MGR: '', MAINT_WORKER: '', MAT_MGR: '', VIEWER: '' },
};

// ═══════════════════════════════════════════════════════════
// 5. 채번 규칙 (proposal 5-7)
// ═══════════════════════════════════════════════════════════
const numberingRules = [
  { num_type: 'ITEM', prefix: 'RM', date_format: '', seq_length: 4, last_seq: 0 },
  { num_type: 'PROD_PLAN', prefix: 'PP', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'WORK_ORDER', prefix: 'WO', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'LOT', prefix: '', date_format: 'YYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'INSPECTION', prefix: 'QC', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'SHIPPING', prefix: 'SH', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'DEFECT', prefix: 'DF', date_format: 'YYYYMMDD', seq_length: 4, last_seq: 0 },
  { num_type: 'MAINTENANCE', prefix: 'MT', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'ISSUE', prefix: 'IS', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'INCOMING', prefix: 'IC', date_format: 'YYYYMMDD', seq_length: 3, last_seq: 0 },
  { num_type: 'DEMAND', prefix: 'DM', date_format: 'YYMMDD', seq_length: 4, last_seq: 0 },
];

// ═══════════════════════════════════════════════════════════
// Seed runner
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log('🌱 Seeding database...\n');

  // --- 공통코드 ---
  for (const grp of commonCodeGroups) {
    await prisma.tbCommonCodeGrp.upsert({
      where: { group_cd: grp.group_cd },
      update: { group_nm: grp.group_nm },
      create: { group_cd: grp.group_cd, group_nm: grp.group_nm, create_by: 'SYSTEM' },
    });
    for (let i = 0; i < grp.codes.length; i++) {
      const c = grp.codes[i];
      await prisma.tbCommonCode.upsert({
        where: { group_cd_code: { group_cd: grp.group_cd, code: c.code } },
        update: { code_nm: c.code_nm, sort_order: i + 1 },
        create: { group_cd: grp.group_cd, code: c.code, code_nm: c.code_nm, sort_order: i + 1, create_by: 'SYSTEM' },
      });
    }
  }
  console.log(`✅ 공통코드: ${commonCodeGroups.length}개 그룹, ${commonCodeGroups.reduce((s, g) => s + g.codes.length, 0)}개 상세코드`);

  // --- 역할 ---
  for (const role of roles) {
    await prisma.tbRole.upsert({
      where: { role_cd: role.role_cd },
      update: { role_nm: role.role_nm, role_desc: role.role_desc },
      create: { ...role, create_by: 'SYSTEM' },
    });
  }
  console.log(`✅ 역할: ${roles.length}개`);

  // --- 메뉴 (순서 중요: 부모 먼저 삽입) ---
  // Sort by depth then sort_order to ensure parents are created first
  const sortedMenus = [...menus].sort((a, b) => a.depth - b.depth || a.sort_order - b.sort_order);
  for (const m of sortedMenus) {
    await prisma.tbMenu.upsert({
      where: { menu_id: m.menu_id },
      update: { menu_nm: m.menu_nm, menu_url: m.menu_url, sort_order: m.sort_order, depth: m.depth, parent_menu_id: m.parent_menu_id },
      create: { menu_id: m.menu_id, parent_menu_id: m.parent_menu_id, menu_nm: m.menu_nm, menu_url: m.menu_url, sort_order: m.sort_order, depth: m.depth, create_by: 'SYSTEM' },
    });
  }
  console.log(`✅ 메뉴: ${menus.length}개 (대메뉴 11 + 하위메뉴 ${menus.length - 11})`);

  // --- 역할-메뉴 권한 ---
  let roleMenuCount = 0;
  for (const [topMenuIdStr, rolePerms] of Object.entries(permMatrix)) {
    const topMenuId = Number(topMenuIdStr);
    // Collect this top-level menu + its children
    const menuIds = menus.filter(m => m.menu_id === topMenuId || m.parent_menu_id === topMenuId).map(m => m.menu_id);

    for (const [role_cd, spec] of Object.entries(rolePerms)) {
      if (!spec) continue; // no access
      const p = perm(spec);
      for (const menu_id of menuIds) {
        await prisma.tbRoleMenu.upsert({
          where: { role_cd_menu_id: { role_cd, menu_id } },
          update: { can_create: p.C, can_read: p.R, can_update: p.U, can_delete: p.D },
          create: { role_cd, menu_id, can_create: p.C, can_read: p.R, can_update: p.U, can_delete: p.D, create_by: 'SYSTEM' },
        });
        roleMenuCount++;
      }
    }
  }
  console.log(`✅ 역할-메뉴 권한: ${roleMenuCount}개`);

  // --- 채번 규칙 ---
  for (const nr of numberingRules) {
    await prisma.tbNumbering.upsert({
      where: { num_type: nr.num_type },
      update: { prefix: nr.prefix, date_format: nr.date_format, seq_length: nr.seq_length },
      create: { ...nr, create_by: 'SYSTEM' },
    });
  }
  console.log(`✅ 채번 규칙: ${numberingRules.length}개`);

  // --- 초기 관리자 계정 ---
  const rawAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!rawAdminPassword) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SEED_ADMIN_PASSWORD env var is required in production');
    }
    console.warn('⚠️  SEED_ADMIN_PASSWORD not set — using default "admin" (dev only)');
  }
  const hashedPassword = await bcrypt.hash(rawAdminPassword ?? 'admin', 10);
  await prisma.tbUser.upsert({
    where: { login_id: 'admin' },
    update: { password: hashedPassword, user_nm: '시스템관리자' },
    create: {
      login_id: 'admin',
      password: hashedPassword,
      user_nm: '시스템관리자',
      role_cd: 'SYS_ADMIN',
      status: 'ACTIVE',
      create_by: 'SYSTEM',
    },
  });
  console.log('✅ 초기 관리자 계정 생성 완료');

  // --- 테스트 계정들 (역할별) ---
  const testPassword = await bcrypt.hash('test1234', 10);
  const testUsers = [
    { login_id: 'viewer01', user_nm: '조회전용사용자', role_cd: 'VIEWER' },
    { login_id: 'prod_worker01', user_nm: '생산작업자1', role_cd: 'PROD_WORKER' },
    { login_id: 'qc_mgr01', user_nm: '품질관리자1', role_cd: 'QC_MGR' },
    { login_id: 'plant_mgr01', user_nm: '공장장1', role_cd: 'PLANT_MGR' },
  ];

  for (const u of testUsers) {
    await prisma.tbUser.upsert({
      where: { login_id: u.login_id },
      update: { password: testPassword, user_nm: u.user_nm, role_cd: u.role_cd },
      create: {
        login_id: u.login_id,
        password: testPassword,
        user_nm: u.user_nm,
        role_cd: u.role_cd,
        status: 'ACTIVE',
        create_by: 'SYSTEM',
      },
    });
  }
  console.log('✅ 테스트 계정: viewer01/prod_worker01/qc_mgr01/plant_mgr01 (비밀번호: test1234)');

  // --- NOTI_TYPE 공통코드 ---
  await prisma.tbCommonCodeGrp.upsert({
    where: { group_cd: 'NOTI_TYPE' },
    update: { group_nm: '알림유형' },
    create: { group_cd: 'NOTI_TYPE', group_nm: '알림유형', create_by: 'SYSTEM' },
  });
  const notiTypes = [
    { code: 'STOCK_LOW', code_nm: '재고부족' },
    { code: 'MAINT_DUE', code_nm: '보전일도래' },
    { code: 'DEFECT_FOUND', code_nm: '불량발생' },
    { code: 'SHIP_SCHED', code_nm: '출하예정' },
    { code: 'ACHIEVE_LOW', code_nm: '생산달성률저하' },
  ];
  for (let i = 0; i < notiTypes.length; i++) {
    const nt = notiTypes[i];
    await prisma.tbCommonCode.upsert({
      where: { group_cd_code: { group_cd: 'NOTI_TYPE', code: nt.code } },
      update: { code_nm: nt.code_nm, sort_order: i + 1 },
      create: { group_cd: 'NOTI_TYPE', code: nt.code, code_nm: nt.code_nm, sort_order: i + 1, use_yn: 'Y', create_by: 'SYSTEM' },
    });
  }
  console.log(`✅ NOTI_TYPE 공통코드: ${notiTypes.length}개`);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
