/**
 * Demo seed — fills every empty/low domain so all MES screens have data to render.
 *
 * Idempotent: every row tagged with create_by='DEMO_SEED'. Re-running wipes those
 * rows (in FK-safe order) and regenerates the same shape, so it's safe to run
 * against Supabase multiple times.
 *
 * Depends on L2/L3 seed having run first (admin user, PLANT01, WH01/WH02,
 * RM001/RM002/SEMI001/FIN001, CUST01/CUST02, EQ001..EQ005, W0001..W0005,
 * PROC01..PROC04).
 *
 * Run:  cd foodly-BE && npx tsx prisma/seed-demo.ts
 */

import 'dotenv/config';
import prisma from '../src/config/database';

const MARK = 'DEMO_SEED';

const today = new Date();
today.setHours(0, 0, 0, 0);
function daysAgo(n: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
}
function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

async function wipe() {
  console.log('🧹 Wiping previous DEMO_SEED rows…');
  await prisma.tbInspectResultDtl.deleteMany({ where: { create_by: MARK } });
  await prisma.tbInspectResult.deleteMany({ where: { create_by: MARK } });
  await prisma.tbShipmentDtl.deleteMany({ where: { create_by: MARK } });
  await prisma.tbShipment.deleteMany({ where: { create_by: MARK } });
  await prisma.tbIncomingDtl.deleteMany({ where: { create_by: MARK } });
  await prisma.tbIncoming.deleteMany({ where: { create_by: MARK } });
  await prisma.tbMaterialIssueDtl.deleteMany({ where: { create_by: MARK } });
  await prisma.tbMaterialIssue.deleteMany({ where: { create_by: MARK } });
  await prisma.tbMaterialInput.deleteMany({ where: { create_by: MARK } });
  await prisma.tbEquipStatus.deleteMany({ where: { create_by: MARK } });
  await prisma.tbNotice.deleteMany({ where: { create_by: MARK } });
  await prisma.tbBom.deleteMany({ where: { create_by: MARK } });
  await prisma.tbMold.deleteMany({ where: { create_by: MARK } });
  // Items / customers / demands are additive; delete only DEMO_SEED-marked rows
  await prisma.tbDemand.deleteMany({ where: { create_by: MARK } });
  // Items and customers referenced by other rows — wipe last, but only unmarked FKs point at them
  await prisma.tbCustomer.deleteMany({ where: { create_by: MARK } });
  await prisma.tbItem.deleteMany({ where: { create_by: MARK } });
}

/* ─── 1. Extra items ───────────────────────────────────────── */
async function seedItems() {
  console.log('📦 Items…');
  const items = [
    { item_cd: 'RM003', item_nm: '원자재 C (설탕)', item_type: 'RAW', unit_cd: 'KG', spec: '25kg 포대', safety_stock: 200 },
    { item_cd: 'RM004', item_nm: '원자재 D (식용유)', item_type: 'RAW', unit_cd: 'L', spec: '18L 통', safety_stock: 80 },
    { item_cd: 'RM005', item_nm: '원자재 E (포장재)', item_type: 'RAW', unit_cd: 'EA', spec: 'PP 봉투 500매/박스', safety_stock: 1000 },
    { item_cd: 'SEMI002', item_nm: '반제품 2차가공품', item_type: 'SEMI', unit_cd: 'EA', safety_stock: 40 },
    { item_cd: 'FIN002', item_nm: '완제품 식품 B', item_type: 'FIN', unit_cd: 'BOX', safety_stock: 15 },
    { item_cd: 'FIN003', item_nm: '완제품 식품 C', item_type: 'FIN', unit_cd: 'BOX', safety_stock: 25 },
  ];
  for (const it of items) {
    await prisma.tbItem.upsert({
      where: { item_cd: it.item_cd },
      update: { create_by: MARK },
      create: { ...it, use_yn: 'Y', create_by: MARK },
    });
  }
  console.log(`  +${items.length} items`);
}

/* ─── 2. Extra customers ───────────────────────────────────── */
async function seedCustomers() {
  console.log('🤝 Customers…');
  const customers = [
    { cust_cd: 'CUST03', cust_nm: '편의점 체인 B', cust_type: 'CUSTOMER', biz_no: '123-45-67890', contact_nm: '이편의', tel: '02-1111-2222', email: 'buyer@chainb.co.kr', address: '서울시 중구 세종대로 100' },
    { cust_cd: 'CUST04', cust_nm: '온라인 유통사', cust_type: 'CUSTOMER', biz_no: '234-56-78901', contact_nm: '박온라', tel: '02-3333-4444', email: 'order@online.co.kr', address: '경기도 성남시 분당구 판교로 200' },
    { cust_cd: 'VEND01', cust_nm: '식자재 공급사 A', cust_type: 'VENDOR', biz_no: '345-67-89012', contact_nm: '최공급', tel: '031-555-6666', email: 'sales@food-supply.co.kr', address: '인천시 부평구 부평대로 300' },
    { cust_cd: 'VEND02', cust_nm: '포장재 공급사', cust_type: 'VENDOR', biz_no: '456-78-90123', contact_nm: '정포장', tel: '031-777-8888', email: 'pkg@vendor.co.kr', address: '경기도 평택시 산업로 400' },
  ];
  for (const c of customers) {
    await prisma.tbCustomer.upsert({
      where: { cust_cd: c.cust_cd },
      update: { create_by: MARK },
      create: { ...c, use_yn: 'Y', create_by: MARK },
    });
  }
  console.log(`  +${customers.length} customers`);
}

/* ─── 3. BOMs ─────────────────────────────────────────────── */
async function seedBoms() {
  console.log('🏗️  BOMs…');
  const boms = [
    { parent_item_cd: 'FIN001', child_item_cd: 'SEMI001', level_no: 1, qty: 1, loss_rate: 2, process_cd: 'PROC02' },
    { parent_item_cd: 'FIN001', child_item_cd: 'RM005', level_no: 1, qty: 1, loss_rate: 0, process_cd: 'PROC04' },
    { parent_item_cd: 'FIN002', child_item_cd: 'SEMI002', level_no: 1, qty: 1, loss_rate: 2, process_cd: 'PROC02' },
    { parent_item_cd: 'FIN002', child_item_cd: 'RM005', level_no: 1, qty: 1, loss_rate: 0, process_cd: 'PROC04' },
    { parent_item_cd: 'FIN003', child_item_cd: 'SEMI001', level_no: 1, qty: 1, loss_rate: 2, process_cd: 'PROC02' },
    { parent_item_cd: 'SEMI001', child_item_cd: 'RM001', level_no: 2, qty: 0.8, loss_rate: 3, process_cd: 'PROC01' },
    { parent_item_cd: 'SEMI001', child_item_cd: 'RM002', level_no: 2, qty: 0.2, loss_rate: 1, process_cd: 'PROC01' },
    { parent_item_cd: 'SEMI002', child_item_cd: 'RM003', level_no: 2, qty: 0.5, loss_rate: 2, process_cd: 'PROC01' },
    { parent_item_cd: 'SEMI002', child_item_cd: 'RM004', level_no: 2, qty: 0.1, loss_rate: 1, process_cd: 'PROC01' },
  ];
  for (const b of boms) {
    await prisma.tbBom.create({ data: { ...b, use_yn: 'Y', create_by: MARK } });
  }
  console.log(`  +${boms.length} boms`);
}

/* ─── 4. Molds ─────────────────────────────────────────────── */
async function seedMolds() {
  console.log('🔧 Molds…');
  const molds = [
    { mold_cd: 'MOLD01', mold_nm: '1호 사출금형 (식품A용)', item_cd: 'FIN001', warranty_shots: 100000, current_shots: 45000 },
    { mold_cd: 'MOLD02', mold_nm: '2호 사출금형 (식품B용)', item_cd: 'FIN002', warranty_shots: 80000, current_shots: 62000 },
    { mold_cd: 'MOLD03', mold_nm: '3호 사출금형 (식품C용)', item_cd: 'FIN003', warranty_shots: 100000, current_shots: 12000 },
    { mold_cd: 'MOLD04', mold_nm: '포장 금형', item_cd: null, warranty_shots: 200000, current_shots: 95000 },
    { mold_cd: 'MOLD05', mold_nm: '반제품 1차 금형', item_cd: 'SEMI001', warranty_shots: 150000, current_shots: 78000 },
  ];
  for (const m of molds) {
    await prisma.tbMold.upsert({
      where: { mold_cd: m.mold_cd },
      update: { create_by: MARK },
      create: { ...m, use_yn: 'Y', create_by: MARK },
    });
  }
  console.log(`  +${molds.length} molds`);
}

/* ─── 5. Notices ──────────────────────────────────────────── */
async function seedNotices() {
  console.log('📢 Notices…');
  const notices = [
    { title: '[필독] 4월 셋째주 생산 목표 안내', content: '이번 주 FIN001 3,000 BOX, FIN002 1,500 BOX 생산 목표입니다. 작업자 여러분의 협조 부탁드립니다.', is_popup: 'Y' },
    { title: '설비 점검 일정 공지 (4/20)', content: 'CNC 가공기(EQ003) 정기 점검 일정이 4월 20일로 잡혔습니다. 해당 시간 동안 해당 설비는 운영되지 않습니다.', is_popup: 'N' },
    { title: '신규 품질 기준 적용 안내', content: 'FIN001 제품의 무게 허용 범위가 ±5g 에서 ±3g 으로 강화됩니다. 4월 22일부터 적용 예정.', is_popup: 'N' },
    { title: '안전 교육 실시 안내', content: '분기별 안전 교육이 4월 25일 오후 2시에 실시됩니다. 전 생산직 필수 참석.', is_popup: 'N' },
    { title: 'MES 시스템 업데이트 완료', content: '금형 관리, 보전이력 기능이 추가되었습니다. 사용법은 각 담당자에게 문의하세요.', is_popup: 'N' },
  ];
  for (const n of notices) {
    await prisma.tbNotice.create({ data: { ...n, create_by: MARK } });
  }
  console.log(`  +${notices.length} notices`);
}

/* ─── 6. Equipment status time series ─────────────────────── */
async function seedEquipStatus() {
  console.log('⚙️  Equipment statuses (20일 × 5설비 타임시리즈)…');
  const equipments = ['EQ001', 'EQ002', 'EQ003', 'EQ004', 'EQ005'];
  const statusCycle: Array<{ type: string; mins: number; reason?: string }> = [
    { type: 'RUN', mins: 240 }, // 오전 가동 4시간
    { type: 'IDLE', mins: 60 }, // 점심 1시간
    { type: 'RUN', mins: 180 }, // 오후 가동 3시간
    { type: 'DOWN', mins: 30, reason: 'PM' }, // 예방점검 30분
    { type: 'RUN', mins: 120 }, // 저녁 마감 2시간
  ];
  let count = 0;
  for (let d = 20; d >= 1; d--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - d);
    dayStart.setHours(8, 0, 0, 0);
    for (const equip of equipments) {
      let cursor = new Date(dayStart);
      for (const seg of statusCycle) {
        const start = new Date(cursor);
        const end = new Date(cursor);
        end.setMinutes(end.getMinutes() + seg.mins);
        // 주말 일부 설비 쉬게 만들기 위해 randomize
        const dayOfWeek = start.getDay();
        if ((dayOfWeek === 0 || dayOfWeek === 6) && equip === 'EQ004') {
          cursor = end;
          continue;
        }
        await prisma.tbEquipStatus.create({
          data: {
            equip_cd: equip,
            status_type: seg.type,
            down_reason_cd: seg.reason ?? null,
            start_dt: start,
            end_dt: end,
            duration: seg.mins,
            memo: `${equip} ${seg.type}`,
            create_by: MARK,
          },
        });
        count++;
        cursor = end;
      }
    }
  }
  console.log(`  +${count} status rows`);
}

/* ─── 7. Incomings ────────────────────────────────────────── */
async function seedIncomings() {
  console.log('📥 Incomings…');
  const raws = ['RM001', 'RM002', 'RM003', 'RM004', 'RM005'];
  const vendors = ['VEND01', 'VEND02'];
  let seq = 1;
  for (let i = 0; i < 8; i++) {
    const vendor = vendors[i % vendors.length];
    const daysBack = 18 - i * 2;
    const inc = await prisma.tbIncoming.create({
      data: {
        incoming_no: `DEMO-INC-${String(seq++).padStart(4, '0')}`,
        cust_cd: vendor,
        status: daysBack > 3 ? 'CONFIRMED' : 'PLAN',
        create_by: MARK,
        create_dt: daysAgo(daysBack),
      },
    });
    // 상세 2-3건
    const itemsPerInc = 2 + (i % 2);
    for (let j = 0; j < itemsPerInc; j++) {
      const item = raws[(i + j) % raws.length];
      await prisma.tbIncomingDtl.create({
        data: {
          incoming_id: inc.incoming_id,
          item_cd: item,
          lot_no: null,
          incoming_qty: 500 + j * 100,
          inspect_status: 'PASS',
          create_by: MARK,
        },
      });
    }
  }
  console.log(`  +8 incomings`);
}

/* ─── 8. Material inputs linked to existing L3 WOs ────────── */
async function seedMaterialInputs() {
  console.log('🧪 Material inputs…');
  const wos = await prisma.tbWorkOrder.findMany({
    where: { create_by: 'L3_SEED' },
    select: { wo_id: true, item_cd: true },
    take: 8,
  });
  if (wos.length === 0) {
    console.log('  ⚠️ L3_SEED 작업지시가 없어 스킵');
    return;
  }
  // BOM lookup for child items
  const bomMap = new Map<string, string[]>();
  const boms = await prisma.tbBom.findMany({ select: { parent_item_cd: true, child_item_cd: true } });
  for (const b of boms) {
    const arr = bomMap.get(b.parent_item_cd) ?? [];
    arr.push(b.child_item_cd);
    bomMap.set(b.parent_item_cd, arr);
  }
  let count = 0;
  for (const wo of wos) {
    const children = bomMap.get(wo.item_cd) ?? ['RM001'];
    for (const child of children.slice(0, 3)) {
      await prisma.tbMaterialInput.create({
        data: {
          wo_id: wo.wo_id,
          item_cd: child,
          input_qty: 50 + count * 5,
          worker_id: 'W0001',
          create_by: MARK,
        },
      });
      count++;
    }
  }
  console.log(`  +${count} material inputs`);
}

/* ─── 9. Material issues ──────────────────────────────────── */
async function seedMaterialIssues() {
  console.log('📤 Material issues…');
  const wos = await prisma.tbWorkOrder.findMany({
    where: { create_by: 'L3_SEED' },
    select: { wo_id: true, item_cd: true },
    take: 5,
  });
  if (wos.length === 0) {
    console.log('  ⚠️ L3_SEED 작업지시가 없어 스킵');
    return;
  }
  let seq = 1;
  for (const wo of wos) {
    const issue = await prisma.tbMaterialIssue.create({
      data: {
        issue_no: `DEMO-ISS-${String(seq++).padStart(4, '0')}`,
        wo_id: wo.wo_id,
        status: 'ISSUED',
        create_by: MARK,
      },
    });
    // 2 details
    const items = wo.item_cd.startsWith('FIN') ? ['SEMI001', 'RM005'] : ['RM001', 'RM002'];
    for (const item of items) {
      await prisma.tbMaterialIssueDtl.create({
        data: {
          issue_id: issue.issue_id,
          item_cd: item,
          request_qty: 100,
          issue_qty: 100,
          create_by: MARK,
        },
      });
    }
  }
  console.log(`  +${wos.length} issues`);
}

/* ─── 10. Shipments ───────────────────────────────────────── */
async function seedShipments() {
  console.log('🚚 Shipments…');
  const customers = ['CUST01', 'CUST03', 'CUST04'];
  const finItems = ['FIN001', 'FIN002', 'FIN003'];
  let seq = 1;
  for (let i = 0; i < 6; i++) {
    const cust = customers[i % customers.length];
    const daysBack = 15 - i * 2;
    const ship = await prisma.tbShipment.create({
      data: {
        ship_no: `DEMO-SHIP-${String(seq++).padStart(4, '0')}`,
        cust_cd: cust,
        status: daysBack > 3 ? 'SHIPPED' : 'PLAN',
        plan_dt: daysAgo(daysBack),
        actual_ship_dt: daysBack > 3 ? daysAgo(daysBack - 1) : null,
        create_by: MARK,
      },
    });
    // 2 items per ship
    const count = 1 + (i % 2);
    for (let j = 0; j < count; j++) {
      const item = finItems[(i + j) % finItems.length];
      await prisma.tbShipmentDtl.create({
        data: {
          ship_id: ship.ship_id,
          item_cd: item,
          order_qty: 100 + j * 50,
          actual_qty: daysBack > 3 ? 100 + j * 50 : null,
          create_by: MARK,
        },
      });
    }
  }
  console.log('  +6 shipments');
}

/* ─── 11. Inspect results ─────────────────────────────────── */
async function seedInspectResults() {
  console.log('🔍 Inspect results…');
  const stds = await prisma.tbInspectStd.findMany({ select: { inspect_std_id: true, item_cd: true, inspect_type: true, target_val: true, lsl: true, usl: true } });
  if (stds.length === 0) {
    console.log('  ⚠️ 검사기준이 없어 스킵');
    return;
  }
  let seq = 1;
  for (let i = 0; i < 15; i++) {
    const std = stds[i % stds.length];
    const daysBack = 15 - i;
    const measure = std.target_val ? Number(std.target_val) + (Math.random() - 0.5) * 2 : null;
    const lsl = std.lsl ? Number(std.lsl) : null;
    const usl = std.usl ? Number(std.usl) : null;
    const judge = lsl != null && usl != null && measure != null && (measure < lsl || measure > usl) ? 'FAIL' : 'PASS';
    const ir = await prisma.tbInspectResult.create({
      data: {
        inspect_no: `DEMO-IR-${String(seq++).padStart(4, '0')}`,
        inspect_type: std.inspect_type ?? 'PROCESS',
        item_cd: std.item_cd,
        judge,
        remark: judge === 'FAIL' ? '기준 범위 초과' : '정상',
        create_by: MARK,
        create_dt: daysAgo(daysBack > 0 ? daysBack : 0),
      },
    });
    await prisma.tbInspectResultDtl.create({
      data: {
        inspect_id: ir.inspect_id,
        inspect_std_id: std.inspect_std_id,
        measure_value: measure,
        judge,
        create_by: MARK,
      },
    });
  }
  console.log('  +15 inspect results');
}

/* ─── 12. More demands ────────────────────────────────────── */
async function seedDemands() {
  console.log('📝 Demands…');
  const customers = ['CUST01', 'CUST03', 'CUST04'];
  const finItems = ['FIN001', 'FIN002', 'FIN003'];
  let seq = 1;
  for (let i = 0; i < 8; i++) {
    const cust = customers[i % customers.length];
    const item = finItems[i % finItems.length];
    const daysFuture = 5 + i * 2;
    await prisma.tbDemand.create({
      data: {
        demand_no: `DEMO-DMD-${String(seq++).padStart(4, '0')}`,
        item_cd: item,
        demand_qty: 500 + i * 100,
        due_date: daysAgo(-daysFuture),
        cust_cd: cust,
        remark: `${i + 1}차 발주 — ${cust}`,
        create_by: MARK,
      },
    });
  }
  console.log('  +8 demands');
}

/* ─── Orchestrator ────────────────────────────────────────── */
async function main() {
  console.log('🌱 Demo seed start\n');
  await wipe();
  await seedItems();
  await seedCustomers();
  await seedBoms();
  await seedMolds();
  await seedNotices();
  await seedEquipStatus();
  await seedIncomings();
  await seedDemands();
  await seedMaterialInputs();
  await seedMaterialIssues();
  await seedShipments();
  await seedInspectResults();
  console.log('\n✅ Demo seed complete');
}

main()
  .catch((e) => { console.error('❌ seed-demo failed', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
