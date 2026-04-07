import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseExcelUpload, ExcelColumn, ColumnMap } from '../utils/excel';

/**
 * Helper: build an in-memory Excel buffer with given headers and rows.
 */
async function buildExcelBuffer(
  headers: string[],
  rows: (string | number | null | Date)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('parseExcelUpload', () => {
  const columnMap: ColumnMap = {
    '품목코드': { field: 'itemCode', required: true, type: 'string' },
    '품목명': { field: 'itemName', required: true, type: 'string' },
    '수량': { field: 'quantity', required: false, type: 'number' },
  };

  it('should parse valid rows correctly', async () => {
    const buffer = await buildExcelBuffer(
      ['품목코드', '품목명', '수량'],
      [
        ['ITEM-001', '사과', 100],
        ['ITEM-002', '배', 200],
      ],
    );

    const result = await parseExcelUpload(buffer, columnMap);
    expect(result.data).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.data[0]).toEqual({ itemCode: 'ITEM-001', itemName: '사과', quantity: 100 });
    expect(result.data[1]).toEqual({ itemCode: 'ITEM-002', itemName: '배', quantity: 200 });
  });

  it('should report errors for missing required values', async () => {
    const buffer = await buildExcelBuffer(
      ['품목코드', '품목명', '수량'],
      [
        ['', '사과', 100], // itemCode is required but empty
      ],
    );

    const result = await parseExcelUpload(buffer, columnMap);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].column).toBe('itemCode');
    expect(result.errors[0].row).toBe(2); // row 1 is header
  });

  it('should report errors for invalid number values', async () => {
    const buffer = await buildExcelBuffer(
      ['품목코드', '품목명', '수량'],
      [
        ['ITEM-001', '사과', 'abc' as any], // quantity should be number
      ],
    );

    const result = await parseExcelUpload(buffer, columnMap);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].column).toBe('quantity');
    expect(result.errors[0].message).toContain('숫자');
  });

  it('should skip entirely empty rows', async () => {
    const buffer = await buildExcelBuffer(
      ['품목코드', '품목명', '수량'],
      [
        ['ITEM-001', '사과', 100],
        [null, null, null], // empty row
        ['ITEM-002', '배', 200],
      ],
    );

    const result = await parseExcelUpload(buffer, columnMap);
    expect(result.data).toHaveLength(2);
  });

  it('should handle null optional fields gracefully', async () => {
    const buffer = await buildExcelBuffer(
      ['품목코드', '품목명', '수량'],
      [
        ['ITEM-001', '사과', null], // quantity is optional
      ],
    );

    const result = await parseExcelUpload(buffer, columnMap);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({ itemCode: 'ITEM-001', itemName: '사과', quantity: null });
    expect(result.errors).toHaveLength(0);
  });

  it('should throw when sheet is missing required header columns', async () => {
    const buffer = await buildExcelBuffer(
      ['품목코드'], // missing 품목명 which is required
      [['ITEM-001']],
    );

    await expect(parseExcelUpload(buffer, columnMap)).rejects.toThrow('필수 열이 없습니다');
  });

  it('should handle date type columns', async () => {
    const dateMap: ColumnMap = {
      '날짜': { field: 'date', required: true, type: 'date' },
    };

    const testDate = new Date('2025-01-15');
    const buffer = await buildExcelBuffer(['날짜'], [[testDate]]);

    const result = await parseExcelUpload(buffer, dateMap);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toHaveProperty('date');
    expect(result.errors).toHaveLength(0);
  });
});
