'use client';

import { useCallback, useMemo, useState } from 'react';

import { showToast } from '@/components/ui/sonner';
import { PayloadTooLargeError, downloadFromUrl } from '@/lib/utils/download';

/**
 * FDAL-shaped wrapper around the streaming CSV exports introduced in
 * Part 6. Each backend endpoint
 * `GET /inventory/export/<resource>.csv` accepts the same filter
 * shape as its `findAll` counterpart so callers pass through whatever
 * filter object their list page already has.
 *
 * The hook returns one async function per resource plus a shared
 * `isDownloading` flag — it doesn't pretend to be a TanStack mutation
 * because there's no cached state to reconcile (the response is a
 * blob streamed straight to the browser).
 *
 * 413 PayloadTooLargeError handling: the backend caps export size at
 * 50,000 rows and throws synchronously when the result count exceeds
 * the cap. The download utility re-throws this as
 * `PayloadTooLargeError`. Here we catch it and show a "narrow your
 * filters" toast so the user knows what to do without having to dig
 * into a console error.
 *
 * Filenames default to `<resource>-<YYYY-MM-DD>.csv` matching what the
 * backend Content-Disposition emits, but the consumer can override.
 */

export type InventoryExportResource =
  | 'purchase-orders'
  | 'material-dispatches'
  | 'stock-allocations'
  | 'inventory-stock'
  | 'inventory-transactions'
  | 'vendors'
  | 'warehouses';

const RESOURCE_PATHS: Record<InventoryExportResource, string> = {
  'purchase-orders': '/inventory/export/purchase-orders.csv',
  'material-dispatches': '/inventory/export/material-dispatches.csv',
  'stock-allocations': '/inventory/export/stock-allocations.csv',
  'inventory-stock': '/inventory/export/inventory-stock.csv',
  'inventory-transactions': '/inventory/export/inventory-transactions.csv',
  vendors: '/inventory/export/vendors.csv',
  warehouses: '/inventory/export/warehouses.csv',
};

export interface ExportInventoryOptions {
  /** Resource to export. Determines the backend path. */
  resource: InventoryExportResource;
  /** Optional filter object — forwarded as URL query params. */
  filters?: Record<string, string | number | boolean | undefined>;
  /** Override the saved filename. Defaults to backend-supplied. */
  filename?: string;
}

export interface UseInventoryExportReturn {
  /**
   * Trigger a CSV download. Returns a Promise that resolves once the
   * browser has been handed the blob; rejects on hard errors. 413
   * cases resolve normally after surfacing a toast — the consumer
   * does not need to re-handle them.
   */
  exportCsv: (opts: ExportInventoryOptions) => Promise<void>;
  /** True while at least one export is in flight. */
  isDownloading: boolean;
  /** Last hard error, if any (cleared on next successful run). */
  error: Error | null;
}

/**
 * Convenience hook returning a single `exportCsv(...)` function plus
 * loading/error state. Multiple concurrent exports keep the loading
 * flag true until all of them resolve.
 */
export function useInventoryExport(): UseInventoryExportReturn {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const exportCsv = useCallback(async (opts: ExportInventoryOptions) => {
    setPending((n) => n + 1);
    try {
      await downloadFromUrl({
        path: RESOURCE_PATHS[opts.resource],
        params: opts.filters,
        filename: opts.filename,
      });
      setError(null);
    } catch (err: unknown) {
      if (err instanceof PayloadTooLargeError) {
        // 413 — narrow your filters. We toast here rather than
        // re-throw because the call site is normally an "Export"
        // button click; surfacing the cap is more useful than a
        // promise rejection.
        showToast.error(
          'Export is too large. Narrow your filters (date range, status, …) and try again.',
        );
        return;
      }
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      showToast.error(wrapped.message);
      throw wrapped;
    } finally {
      setPending((n) => Math.max(0, n - 1));
    }
  }, []);

  return useMemo(
    () => ({ exportCsv, isDownloading: pending > 0, error }),
    [exportCsv, pending, error],
  );
}
