'use client';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Button, Chip } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { TableFilterSelect } from './shared/table-filter-select';
import { StockAdjustDialog } from './stock/stock-adjust-dialog';
import { buildStockColumns } from './stock/stock-columns';
import { StockKpiStrip } from './stock/stock-kpi-strip';
import { StockTransferDialog } from './stock/stock-transfer-dialog';

import { AdvancedTable } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import {
  type InventoryStock,
  type InventoryStockFilters,
  useInventoryStockList,
} from '@/lib/hooks/resources/inventory-stock';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { useAuth } from '@/providers/auth-provider';

type StockRow = InventoryStock & Record<string, unknown>;
const EMPTY_ROWS: StockRow[] = [];

/**
 * Inventory Stock list page (Part: rebuild-stock-pages).
 *
 * Layout:
 *   1. Header (title + low-stock chip when ?filter=low-stock).
 *   2. KPI stripe (page-scoped aggregates — see use-stock-aggregates.ts
 *      for why these aren't org-wide).
 *   3. SavedViewsBar (chip strip for saved filters; hidden if the user
 *      lacks `saved-view:read`).
 *   4. AdvancedTable with toolbar filters (warehouse, low-stock toggle),
 *      CSV export, and per-row action menu.
 *
 * Cross-page concerns wired here:
 *   - URL state sync via useResourceList(syncToUrl: true) so deep links
 *     and back/forward work as users tweak filters.
 *   - Permission gating: adjust + transfer actions check inventory:write
 *     via useAuth.hasPermission. Admins (platform_admin/super_admin/admin)
 *     bypass via the auth-store fix.
 *   - Saved views: parent owns URL writes for ?view= per the SavedViewsBar
 *     contract; on chip select we call setFilters({...}) inside the same
 *     transition that updates the URL.
 */
export function InventoryStockPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLowStockUrlFilter = searchParams.get('filter') === 'low-stock';
  const activeViewId = searchParams.get('view');

  const { hasPermission } = useAuth();
  const canAdjust = hasPermission('stock:adjust') || hasPermission('inventory:write');
  const canTransfer = hasPermission('stock:transfer') || hasPermission('inventory:write');
  const canExport = hasPermission('inventory:export') || hasPermission('inventory:read');

  const defaultFilters = useMemo<Partial<InventoryStockFilters>>(
    () => (isLowStockUrlFilter ? { lowStock: true } : {}),
    [isLowStockUrlFilter],
  );

  const list = useInventoryStockList({
    defaultFilters: defaultFilters as Record<string, unknown>,
  });

  const {
    items,
    pagination,
    search,
    setSearch,
    sorting,
    filters,
    setFilter,
    setFilters,
    isLoading,
    isFetching,
    isError,
  } = list;

  const rows: StockRow[] = (items ?? EMPTY_ROWS) as StockRow[];

  // Warehouse filter dropdown — pull active warehouses, cap at 100.
  const warehouses = useWarehouses({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' },
  });

  // Dialog state.
  const [adjustTarget, setAdjustTarget] = useState<InventoryStock | null>(null);
  const [transferTarget, setTransferTarget] = useState<InventoryStock | null>(null);

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'inventory-stock',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      // Update URL for ?view= (preserves other params).
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      // Reset pagination when applying a new view to avoid landing on an
      // out-of-range page when the view shrinks the result set.
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.STOCK}?${params.toString()}`);
      // Apply the view's filters via the resource state.
      setFilters(viewFilters as Partial<InventoryStockFilters>);
    },
    [searchParams, router, setFilters],
  );

  const columns = useMemo(
    () =>
      buildStockColumns({
        onView: (row) =>
          router.push(ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id)),
        onAdjust: (row) => setAdjustTarget(row),
        onTransfer: (row) => setTransferTarget(row),
        canAdjust,
        canTransfer,
      }),
    [router, canAdjust, canTransfer],
  );

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title={isLowStockUrlFilter ? 'No low stock items' : 'No stock records'}
          description={
            isLowStockUrlFilter
              ? 'Every product is above its minimum threshold. Adjust thresholds in the product master if you expect alerts.'
              : 'Stock is created when a Purchase Order is received. Receive a PO to see records here.'
          }
        />
      ),
    [search, setSearch, isLowStockUrlFilter],
  );

  const warehouseOptions = useMemo(
    () =>
      (warehouses.items ?? []).map((w) => ({
        value: w.id,
        label: `${w.name} (${w.code})`,
      })),
    [warehouses.items],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TableFilterSelect
          label="Warehouse"
          value={(filters.warehouseId as string | undefined) ?? ''}
          options={warehouseOptions}
          onChange={(value) =>
            setFilter('warehouseId', (value || undefined))
          }
          allLabel="All warehouses"
          minWidth={200}
        />
        <TableFilterSelect
          label="Stock level"
          value={filters.lowStock ? 'low' : 'all'}
          options={[{ value: 'low', label: 'Low stock only' }]}
          onChange={(value) =>
            setFilter(
              'lowStock',
              (value === 'all' ? undefined : true) as InventoryStockFilters['lowStock'],
            )
          }
          allLabel="All levels"
          minWidth={170}
        />
        {canExport && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => void handleExport()}
            disabled={exporter.isDownloading}
          >
            {exporter.isDownloading ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>
    ),
    [
      filters.warehouseId,
      filters.lowStock,
      warehouseOptions,
      setFilter,
      canExport,
      exporter.isDownloading,
      handleExport,
    ],
  );

  if (isError) {
    return (
      <ErrorState
        title="Failed to load stock"
        description="Unable to load inventory data. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">
            {isLowStockUrlFilter ? 'Low stock items' : 'Stock levels'}
          </MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'item' : 'items'}
          </MUITypography>
        </div>
        {isLowStockUrlFilter && (
          <Chip
            icon={<WarningAmberIcon />}
            label="Low stock filter active"
            color="warning"
            variant="outlined"
            size="small"
          />
        )}
      </div>

      <StockKpiStrip rows={rows} totalRows={pagination.total} isLoading={isLoading} />

      <SavedViewsBar
        resource="inventory-stock"
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<StockRow>
        columns={columns}
        rows={rows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        page={Math.max(pagination.page - 1, 0)}
        pageSize={pagination.pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        totalRowCount={pagination.total}
        sortModel={sortModel}
        onPageChange={(page) => pagination.setPage(page + 1)}
        onPageSizeChange={pagination.setPageSize}
        onSortChange={(model) => {
          if (model) sorting.setSorting(model.field, model.direction === 'asc' ? 'ASC' : 'DESC');
          else sorting.clearSort();
        }}
        onSearchChange={setSearch}
        initialSearch={search}
        onRowClick={(row) =>
          router.push(ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id))
        }
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by product or warehouse…"
        itemLabel="items"
        renderEmptyState={renderEmptyState}
      />

      <StockAdjustDialog
        open={adjustTarget !== null}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
        stock={adjustTarget}
      />
      <StockTransferDialog
        open={transferTarget !== null}
        onOpenChange={(o) => !o && setTransferTarget(null)}
        stock={transferTarget}
      />
    </div>
  );
}
