import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

// ─── Status Label Map ───

const STATUS_LABEL: Record<string, string> = {
  PLAN: 'Planned',
  SHIPPED: 'Shipped',
  CANCEL_REQ: 'Cancel Requested',
  CANCELLED: 'Cancelled',
};

// ─── Shared Helpers ───

function drawInfoTable(doc: PDFKit.PDFDocument, info: [string, string][]) {
  const leftCol = 50;
  const rightCol = 170;
  doc.fontSize(10);
  for (const [label, value] of info) {
    const y = doc.y;
    doc.fillColor('#333').text(label, leftCol, y, { width: 110, continued: false });
    doc.fillColor('#000').text(value, rightCol, y);
  }
  doc.moveDown(1);
}

function drawDetailTableHeader(
  doc: PDFKit.PDFDocument,
  columns: { label: string; x: number }[],
) {
  const tableTop = doc.y;
  doc.fontSize(9).fillColor('#333');
  for (const col of columns) {
    doc.text(col.label, col.x, tableTop);
  }
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ccc').stroke();
  doc.moveDown(0.3);
  doc.fillColor('#000');
}

function checkPageBreak(doc: PDFKit.PDFDocument, minY = 750) {
  if (doc.y > minY) {
    doc.addPage();
  }
}

function formatDate(dt: Date | null | undefined): string {
  if (!dt) return '-';
  return new Date(dt).toISOString().slice(0, 10);
}

function formatDateTime(dt: Date | null | undefined): string {
  if (!dt) return '-';
  return new Date(dt).toISOString().slice(0, 19).replace('T', ' ');
}

// ─── Main Export ───

export async function generateShipmentPdf(
  shipId: number,
  docType: 'order' | 'statement' | 'delivery' | 'inspection',
): Promise<PDFKit.PDFDocument> {
  // Fetch shipment data
  const shipment = await prisma.tbShipment.findUnique({
    where: { ship_id: shipId },
    select: {
      ship_id: true,
      ship_no: true,
      cust_cd: true,
      status: true,
      plan_dt: true,
      actual_ship_dt: true,
      remark: true,
      create_by: true,
      create_dt: true,
      customer: { select: { cust_nm: true } },
      details: {
        select: {
          ship_dtl_id: true,
          item_cd: true,
          lot_no: true,
          order_qty: true,
          actual_qty: true,
          item: { select: { item_nm: true } },
          lot: { select: { lot_qty: true, lot_status: true } },
        },
        orderBy: { ship_dtl_id: 'asc' },
      },
    },
  });

  if (!shipment) throw new AppError('존재하지 않는 출하입니다.', 404);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  switch (docType) {
    case 'order':
      await renderShipmentOrder(doc, shipment);
      break;
    case 'statement':
      await renderTransactionStatement(doc, shipment);
      break;
    case 'delivery':
      await renderDeliveryNote(doc, shipment);
      break;
    case 'inspection':
      await renderInspectionCertificate(doc, shipment);
      break;
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#aaa').text(
    `Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
    { align: 'right' },
  );

  doc.end();
  return doc;
}

// ─── 1. Shipment Order (출하지시서) ───

async function renderShipmentOrder(doc: PDFKit.PDFDocument, shipment: any) {
  // Header
  doc.fontSize(18).fillColor('#000').text('Shipment Order', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Ship No: ${shipment.ship_no}`, { align: 'center' });
  doc.moveDown(1);

  // Basic Info
  doc.fontSize(12).fillColor('#000').text('Basic Information', { underline: true });
  doc.moveDown(0.5);

  const info: [string, string][] = [
    ['Ship No', shipment.ship_no],
    ['Customer Code', shipment.cust_cd],
    ['Customer Name', shipment.customer?.cust_nm ?? '-'],
    ['Plan Date', formatDate(shipment.plan_dt)],
    ['Status', STATUS_LABEL[shipment.status] ?? shipment.status],
    ['Remark', shipment.remark ?? '-'],
    ['Created By', shipment.create_by ?? '-'],
    ['Created At', formatDateTime(shipment.create_dt)],
  ];
  drawInfoTable(doc, info);

  // Detail Table
  doc.fontSize(12).fillColor('#000').text('Shipment Details', { underline: true });
  doc.moveDown(0.5);

  const colSeq = 50;
  const colItemCd = 90;
  const colItemNm = 200;
  const colLotNo = 350;
  const colOrderQty = 450;
  const colActualQty = 510;

  const columns = [
    { label: 'Seq', x: colSeq },
    { label: 'Item Code', x: colItemCd },
    { label: 'Item Name', x: colItemNm },
    { label: 'LOT No', x: colLotNo },
    { label: 'Order Qty', x: colOrderQty },
  ];

  const isShipped = shipment.status === 'SHIPPED';
  if (isShipped) {
    columns.push({ label: 'Actual Qty', x: colActualQty });
  }

  drawDetailTableHeader(doc, columns);

  if (shipment.details.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No details.');
  } else {
    doc.fontSize(9).fillColor('#000');
    shipment.details.forEach((dtl: any, idx: number) => {
      checkPageBreak(doc);
      const rowY = doc.y;
      doc.text(String(idx + 1), colSeq, rowY);
      doc.text(dtl.item_cd, colItemCd, rowY);
      doc.text(dtl.item?.item_nm ?? '-', colItemNm, rowY, { width: 140 });
      doc.text(dtl.lot_no ?? '-', colLotNo, rowY, { width: 95 });
      doc.text(dtl.order_qty != null ? Number(dtl.order_qty).toLocaleString() : '-', colOrderQty, rowY);
      if (isShipped) {
        doc.text(dtl.actual_qty != null ? Number(dtl.actual_qty).toLocaleString() : '-', colActualQty, rowY);
      }
      doc.moveDown(0.2);
    });
  }
}

// ─── 2. Transaction Statement (거래명세서) ───

async function renderTransactionStatement(doc: PDFKit.PDFDocument, shipment: any) {
  // Header
  doc.fontSize(18).fillColor('#000').text('Transaction Statement', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Ship No: ${shipment.ship_no}`, { align: 'center' });
  doc.moveDown(1);

  // From / To Section
  doc.fontSize(12).fillColor('#000').text('From / To', { underline: true });
  doc.moveDown(0.5);

  const fromTo: [string, string][] = [
    ['From (Sender)', 'Foodly Co., Ltd.'],
    ['To (Receiver)', `${shipment.customer?.cust_nm ?? '-'} (${shipment.cust_cd})`],
    ['Ship Date', formatDate(shipment.actual_ship_dt ?? shipment.plan_dt)],
  ];
  drawInfoTable(doc, fromTo);

  // Detail Table
  doc.fontSize(12).fillColor('#000').text('Items', { underline: true });
  doc.moveDown(0.5);

  const colSeq = 50;
  const colItemCd = 90;
  const colItemNm = 200;
  const colLotNo = 350;
  const colQty = 440;
  const colUnit = 480;
  const colAmount = 510;

  drawDetailTableHeader(doc, [
    { label: 'Seq', x: colSeq },
    { label: 'Item Code', x: colItemCd },
    { label: 'Item Name', x: colItemNm },
    { label: 'LOT No', x: colLotNo },
    { label: 'Qty', x: colQty },
    { label: 'Unit', x: colUnit },
    { label: 'Amount', x: colAmount },
  ]);

  let totalQty = 0;

  if (shipment.details.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No details.');
  } else {
    doc.fontSize(9).fillColor('#000');
    shipment.details.forEach((dtl: any, idx: number) => {
      checkPageBreak(doc);
      const qty = dtl.actual_qty != null ? Number(dtl.actual_qty) : Number(dtl.order_qty ?? 0);
      totalQty += qty;
      const rowY = doc.y;
      doc.text(String(idx + 1), colSeq, rowY);
      doc.text(dtl.item_cd, colItemCd, rowY);
      doc.text(dtl.item?.item_nm ?? '-', colItemNm, rowY, { width: 140 });
      doc.text(dtl.lot_no ?? '-', colLotNo, rowY, { width: 85 });
      doc.text(qty.toLocaleString(), colQty, rowY);
      doc.text('EA', colUnit, rowY);
      doc.text('-', colAmount, rowY);
      doc.moveDown(0.2);
    });

    // Total row
    checkPageBreak(doc);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke();
    doc.moveDown(0.3);
    const totalY = doc.y;
    doc.fontSize(9).fillColor('#333').text('Total', colItemNm, totalY);
    doc.fillColor('#000').text(totalQty.toLocaleString(), colQty, totalY);
    doc.moveDown(1);
  }

  // Note
  doc.fontSize(9).fillColor('#555').text(
    'This statement confirms the transaction of goods as listed above.',
    { align: 'left' },
  );
}

// ─── 3. Delivery Note (납품서) ───

async function renderDeliveryNote(doc: PDFKit.PDFDocument, shipment: any) {
  // Header
  doc.fontSize(18).fillColor('#000').text('Delivery Note', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Ship No: ${shipment.ship_no}`, { align: 'center' });
  doc.moveDown(1);

  // Ship To / Date
  doc.fontSize(12).fillColor('#000').text('Delivery Information', { underline: true });
  doc.moveDown(0.5);

  const shipDate = shipment.status === 'SHIPPED' ? shipment.actual_ship_dt : shipment.plan_dt;
  const deliveryInfo: [string, string][] = [
    ['Ship To', `${shipment.customer?.cust_nm ?? '-'} (${shipment.cust_cd})`],
    ['Ship Date', formatDate(shipDate)],
  ];
  drawInfoTable(doc, deliveryInfo);

  // Detail Table
  doc.fontSize(12).fillColor('#000').text('Items', { underline: true });
  doc.moveDown(0.5);

  const colSeq = 50;
  const colItemCd = 90;
  const colItemNm = 200;
  const colLotNo = 370;
  const colQty = 480;

  drawDetailTableHeader(doc, [
    { label: 'Seq', x: colSeq },
    { label: 'Item Code', x: colItemCd },
    { label: 'Item Name', x: colItemNm },
    { label: 'LOT No', x: colLotNo },
    { label: 'Qty', x: colQty },
  ]);

  if (shipment.details.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No details.');
  } else {
    doc.fontSize(9).fillColor('#000');
    shipment.details.forEach((dtl: any, idx: number) => {
      checkPageBreak(doc);
      const qty = dtl.actual_qty != null ? Number(dtl.actual_qty) : Number(dtl.order_qty ?? 0);
      const rowY = doc.y;
      doc.text(String(idx + 1), colSeq, rowY);
      doc.text(dtl.item_cd, colItemCd, rowY);
      doc.text(dtl.item?.item_nm ?? '-', colItemNm, rowY, { width: 160 });
      doc.text(dtl.lot_no ?? '-', colLotNo, rowY, { width: 105 });
      doc.text(qty.toLocaleString(), colQty, rowY);
      doc.moveDown(0.2);
    });
  }

  // Signature Line
  doc.moveDown(3);
  checkPageBreak(doc, 700);
  doc.fontSize(10).fillColor('#000').text(
    'Received by: ________________  Date: ________________',
    { align: 'left' },
  );
}

// ─── 4. Inspection Certificate (검사성적서) ───

async function renderInspectionCertificate(doc: PDFKit.PDFDocument, shipment: any) {
  // Header
  doc.fontSize(18).fillColor('#000').text('Inspection Certificate', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Ship No: ${shipment.ship_no}`, { align: 'center' });
  doc.moveDown(1);

  // Basic Info
  doc.fontSize(12).fillColor('#000').text('Shipment Information', { underline: true });
  doc.moveDown(0.5);

  const info: [string, string][] = [
    ['Ship No', shipment.ship_no],
    ['Customer', `${shipment.customer?.cust_nm ?? '-'} (${shipment.cust_cd})`],
    ['Ship Date', formatDate(shipment.actual_ship_dt ?? shipment.plan_dt)],
    ['Status', STATUS_LABEL[shipment.status] ?? shipment.status],
  ];
  drawInfoTable(doc, info);

  // Fetch inspection results for all lot_nos in this shipment
  const lotNos = shipment.details
    .map((d: any) => d.lot_no)
    .filter((l: string | null) => l != null) as string[];

  let inspectResultsMap: Map<string, any> = new Map();
  if (lotNos.length > 0) {
    const inspectResults = await prisma.tbInspectResult.findMany({
      where: {
        lot_no: { in: lotNos },
        inspect_type: 'SHIPPING',
      },
      select: {
        inspect_id: true,
        inspect_no: true,
        lot_no: true,
        item_cd: true,
        judge: true,
        create_dt: true,
      },
    });
    for (const r of inspectResults) {
      if (r.lot_no) {
        inspectResultsMap.set(r.lot_no, r);
      }
    }
  }

  // Per-lot inspection section
  doc.fontSize(12).fillColor('#000').text('Inspection Results', { underline: true });
  doc.moveDown(0.5);

  if (shipment.details.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No shipment details.');
  } else {
    for (const dtl of shipment.details) {
      checkPageBreak(doc, 700);

      doc.fontSize(10).fillColor('#000');
      doc.text(`LOT No: ${dtl.lot_no ?? '-'}  |  Item Code: ${dtl.item_cd}  |  Item Name: ${dtl.item?.item_nm ?? '-'}`);
      doc.moveDown(0.3);

      if (!dtl.lot_no) {
        doc.fontSize(9).fillColor('#999').text('  No LOT assigned — no inspection data.');
      } else {
        const result = inspectResultsMap.get(dtl.lot_no);
        if (!result) {
          doc.fontSize(9).fillColor('#999').text('  No inspection data');
        } else {
          const judgeColor = result.judge === 'PASS' ? '#006400' : '#cc0000';
          const judgeLine = `  Result: `;
          const judgeLabel = result.judge ?? '-';
          doc.fontSize(9).fillColor('#333').text(judgeLine, { continued: true });
          doc.fillColor(judgeColor).text(judgeLabel, { continued: true });
          doc.fillColor('#333').text(`  |  Inspection Date: ${formatDateTime(result.create_dt)}`);
        }
      }

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eee').stroke();
      doc.moveDown(0.5);
    }
  }

  // Certification statement
  doc.moveDown(1);
  checkPageBreak(doc, 700);
  doc.fontSize(9).fillColor('#555').text(
    'We hereby certify that the above items have been inspected and meet quality standards.',
    { align: 'left' },
  );
}
