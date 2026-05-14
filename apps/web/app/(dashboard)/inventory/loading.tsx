import { Skeleton } from '@mui/material';

/**
 * Next.js Suspense boundary for all /inventory/* routes.
 *
 * Without this file Next.js App Router keeps the previous page's content
 * visible while the new page loads (soft navigation with startTransition),
 * which means navigating from Warehouses → Stock briefly shows warehouse
 * rows under the "Stock levels" heading and vice-versa.
 *
 * Adding loading.tsx immediately swaps in this skeleton so users see a
 * neutral loading state instead of confusingly mismatched data.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for loading files
export default function InventoryLoading(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton variant="text" width={180} height={32} />
          <Skeleton variant="text" width={80} height={18} />
        </div>
        <Skeleton variant="rounded" width={140} height={32} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} />
        ))}
      </div>

      {/* Saved views bar */}
      <Skeleton variant="rounded" height={36} width={240} />

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-divider">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-divider px-3 py-2">
          <Skeleton variant="rounded" width={220} height={32} />
          <div className="flex-1" />
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={96} height={32} />
          <Skeleton variant="rounded" width={104} height={32} />
        </div>

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-divider px-4 py-3">
            <Skeleton variant="text" width="25%" height={16} />
            <Skeleton variant="text" width="15%" height={16} />
            <Skeleton variant="text" width="20%" height={16} />
            <Skeleton variant="text" width="15%" height={16} />
            <Skeleton variant="text" width="15%" height={16} />
          </div>
        ))}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2">
          <Skeleton variant="text" width={160} height={16} />
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" width={60} height={28} />
            <Skeleton variant="rounded" width={120} height={28} />
          </div>
        </div>
      </div>
    </div>
  );
}
