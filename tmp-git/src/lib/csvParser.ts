import { read, utils } from 'xlsx';

export interface SheetData {
  sheetName: string;
  columns: string[];
  rows: Record<string, any>[];
}

/**
 * Parse an Excel file (as Buffer) and return up to first four sheets.
 * Returns column headers and row objects. Also includes any extra columns
 * detected (all columns are returned, caller can decide which are unexpected).
 */
export function parseExcel(buffer: Buffer): SheetData[] {
  const workbook = read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames.slice(0, 4);
  const result: SheetData[] = [];

  for (const name of sheetNames) {
    const ws = workbook.Sheets[name];
    const json: Record<string, any>[] = utils.sheet_to_json(ws, { defval: null });
    const headers = (utils.sheet_to_json(ws, { header: 1 })[0] as string[]) || [];
    result.push({
      sheetName: name,
      columns: headers,
      rows: json,
    });
  }
  return result;
}
