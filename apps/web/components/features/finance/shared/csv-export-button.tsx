'use client';

import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button } from '@mui/material';
import * as React from 'react';

import { showToast } from '@/components/ui/sonner';

const CAP = 5000;

export interface CsvColumn<T> {
  /** Header cell text. */
  header: string;
  /** Per-row value extractor. Return primitives; nullish ⇒ empty cell. */
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export interface CsvExportButtonProps<T> {
  /**
   * Async fetcher that returns the FULL filtered dataset (or as much as
   * fits within the cap). Caller is responsible for re-issuing the same
   * filter shape with `limit=CAP, page=1`.
   */
  fetchAll: (cap: number) => Promise<T[]>;
  columns: CsvColumn<T>[];
  /** Filename without extension. `.csv` is appended automatically. */
  filename: string;
  /** Disable while parent has no data to export. */
  disabled?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Client-side CSV exporter. Fetches the full filtered set (capped at
 * `CAP` rows), serialises to CSV with proper quoting + BOM (so Excel
 * opens UTF-8 cleanly), and triggers a Blob download. Surfaces a
 * "result truncated" toast when the response hits exactly the cap so
 * the user knows to narrow their filters.
 *
 * No new backend route required — uses the same /finance/* endpoint
 * the parent page is already hitting.
 */
export function CsvExportButton<T>({
  fetchAll,
  columns,
  filename,
  disabled,
  size = 'small',
}: CsvExportButtonProps<T>): React.JSX.Element {
  const [busy, setBusy] = React.useState(false);

  const handleClick = React.useCallback(async (): Promise<void> => {
    setBusy(true);
    showToast.info(`Exporting up to ${CAP.toLocaleString('en-IN')} rows…`);
    try {
      const rows = await fetchAll(CAP);
      const csv = toCsv(rows, columns);
      downloadCsv(csv, `${filename}.csv`);

      if (rows.length === CAP) {
        showToast.warning(
          `Result truncated at ${CAP.toLocaleString('en-IN')} rows. Add more filters to export the full set.`,
        );
      } else {
        showToast.success(`Exported ${rows.length.toLocaleString('en-IN')} rows`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      showToast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [fetchAll, columns, filename]);

  return (
    <Button
      onClick={() => void handleClick()}
      disabled={disabled || busy}
      size={size}
      variant="outlined"
      color="inherit"
      startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
      sx={{ textTransform: 'none', fontWeight: 500 }}
    >
      {busy ? 'Exporting…' : 'Export CSV'}
    </Button>
  );
}

// ============================================================================
// Internals
// ============================================================================

function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => csvCell(c.header)).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.accessor(row))).join(','));
  }
  return lines.join('\n');
}

/**
 * Quote per RFC 4180 — wrap in double quotes if the value contains
 * comma, double-quote, CR, or LF; double-up any internal double quotes.
 * Booleans render as 'Yes'/'No' for human-readability in spreadsheets.
 */
function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  if (/[,"\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadCsv(csv: string, filename: string): void {
  // BOM ensures Excel reads UTF-8 (₹, ✓, etc.) without garbling.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
