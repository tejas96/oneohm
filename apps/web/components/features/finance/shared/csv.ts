/**
 * Standalone CSV helpers shared by `CsvExportButton` and the Reports
 * launchpad dialogs. Kept as a tiny pure module so headless callers
 * (e.g. report exporters) can build & download a CSV without mounting
 * the button component.
 *
 * Format: RFC 4180 quoting + UTF-8 BOM so Excel opens ₹/non-ASCII
 * cleanly.
 */

export const CSV_CAP = 5000;

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => csvCell(c.header)).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.accessor(row))).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  if (/[,"\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
