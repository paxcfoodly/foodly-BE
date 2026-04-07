import ExcelJS from 'exceljs';
import { Response } from 'express';
import { AppError } from '../middlewares/errorHandler';

// ─── Types ───

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelParseResult<T = Record<string, unknown>> {
  data: T[];
  errors: ExcelParseError[];
}

export interface ExcelParseError {
  row: number;
  column: string;
  message: string;
}

export type ColumnMap = Record<string, {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date';
}>;

// ─── Export ───

/**
 * Stream an Excel file as an HTTP response.
 *
 * @param res      Express response object
 * @param columns  Column definitions (header, key, optional width)
 * @param data     Row data array – each item's keys match column.key
 * @param filename Download filename (without extension)
 */
export async function exportToExcel(
  res: Response,
  columns: ExcelColumn[],
  data: Record<string, unknown>[],
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Foodly MES';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Sheet1');

  // Columns
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? Math.max(col.header.length + 4, 12),
  }));

  // Header style
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Data rows
  data.forEach((row) => sheet.addRow(row));

  // Auto-fit column widths based on content (min width from header)
  sheet.columns.forEach((column) => {
    if (!column || !column.eachCell) return;
    let maxLen = (column.header as string)?.length ?? 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const cellLen = cell.value ? String(cell.value).length : 0;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    column.width = Math.min(maxLen + 2, 50);
  });

  // Stream response
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
  );

  await workbook.xlsx.write(res);
  res.end();
}

// ─── Import / Parse ───

/**
 * Parse an uploaded Excel file buffer, mapping headers to fields and validating.
 *
 * @param buffer     File buffer (from multer memoryStorage or fs.readFile)
 * @param columnMap  Maps Excel header name → { field, required?, type? }
 * @returns Parsed data rows + per-cell error list
 */
export async function parseExcelUpload<T = Record<string, unknown>>(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  columnMap: ColumnMap,
): Promise<ExcelParseResult<T>> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new AppError('엑셀 파일에 시트가 없습니다.', 400);
  }

  // Map header row → column indices
  const headerRow = sheet.getRow(1);
  const headerMap = new Map<number, { field: string; required: boolean; type: string }>();

  headerRow.eachCell((cell, colNumber) => {
    const headerName = String(cell.value ?? '').trim();
    const mapping = columnMap[headerName];
    if (mapping) {
      headerMap.set(colNumber, {
        field: mapping.field,
        required: mapping.required ?? false,
        type: mapping.type ?? 'string',
      });
    }
  });

  // Check all required headers exist
  const mappedFields = new Set([...headerMap.values()].map((v) => v.field));
  for (const [headerName, mapping] of Object.entries(columnMap)) {
    if (mapping.required && !mappedFields.has(mapping.field)) {
      throw new AppError(`필수 열이 없습니다: ${headerName}`, 400);
    }
  }

  const data: T[] = [];
  const errors: ExcelParseError[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const record: Record<string, unknown> = {};
    let hasValue = false;

    headerMap.forEach((colDef, colNumber) => {
      const cell = row.getCell(colNumber);
      const rawValue = cell.value;

      // Required check
      if (colDef.required && (rawValue === null || rawValue === undefined || rawValue === '')) {
        errors.push({ row: rowNumber, column: colDef.field, message: '필수 값이 비어 있습니다.' });
        record[colDef.field] = null;
        return;
      }

      // Type coercion & validation
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        record[colDef.field] = null;
        return;
      }

      hasValue = true;

      switch (colDef.type) {
        case 'number': {
          const num = Number(rawValue);
          if (isNaN(num)) {
            errors.push({ row: rowNumber, column: colDef.field, message: '숫자 형식이 아닙니다.' });
            record[colDef.field] = null;
          } else {
            record[colDef.field] = num;
          }
          break;
        }
        case 'date': {
          const date = rawValue instanceof Date ? rawValue : new Date(String(rawValue));
          if (isNaN(date.getTime())) {
            errors.push({ row: rowNumber, column: colDef.field, message: '날짜 형식이 아닙니다.' });
            record[colDef.field] = null;
          } else {
            record[colDef.field] = date;
          }
          break;
        }
        default:
          record[colDef.field] = String(rawValue).trim();
      }
    });

    if (hasValue) {
      data.push(record as T);
    }
  });

  return { data, errors };
}
