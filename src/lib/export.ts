import ExcelJS from 'exceljs';
import { COLUMN_WHITELIST, type AllowedColumn } from './export-columns';

export function toCsv(rows: any[], cols: AllowedColumn[]): string {
  const header = cols.join(',');
  const body = rows.map((r) =>
    cols
      .map((c) => csvEscape(COLUMN_WHITELIST[c](r)))
      .join(','),
  );
  return [header, ...body].join('\n');
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function toXlsx(rows: any[], cols: AllowedColumn[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('export');
  ws.columns = cols.map((c) => ({ header: c, key: c }));
  for (const r of rows) {
    const out: Record<string, any> = {};
    for (const c of cols) out[c] = COLUMN_WHITELIST[c](r) ?? '';
    ws.addRow(out);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
