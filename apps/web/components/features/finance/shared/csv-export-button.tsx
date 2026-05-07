'use client';

import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button } from '@mui/material';
import * as React from 'react';

import { CSV_CAP, buildCsv, downloadCsv, type CsvColumn } from './csv';

import { showToast } from '@/components/ui/sonner';

const CAP = CSV_CAP;

export type { CsvColumn };

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
      const csv = buildCsv(rows, columns);
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
