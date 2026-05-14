'use client';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { ALLOCATION_STATUS_LABEL } from '../constants';
import { buildAllocationColumns, type AllocationColumnRow } from './allocations/allocation-columns';
import { AllocationKpiStrip } from './allocations/allocation-kpi-strip';
import { hiddenSelectFilterColumn } from './shared/hidden-filter-column';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableFilterModel, TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import {
  useStockAllocationMutations,
  useStockAllocations,
  type StockAllocationFilters,
} from '@/lib/hooks/resources/stock-allocations';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: AllocationColumnRow[] = [];

const ALLOCATION_LIST_FILTER_FIELDS = {
  status: 'filterStatus',
  warehouseId: 'warehouseId',
} as const;

/**
 * Allocations list page (Part: rebuild-allocation-pages).
 *
 * Mirrors PO list shape: org-wide KPI strip via stats endpoint,
 * AdvancedTable with status + warehouse filters, CSV export, and
 * RowActionMenu inline (Fulfill / Cancel) gated on permissions and
 * status. Note: there is no "Create" button — allocations are created
 * from project BOMs / dispatches, not standalone here.
 */
export function InventoryAllocationsPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get('view');

  const { hasPermission } = useAuth();
  const canWrite = hasPermission('allocation:write') || hasPermission('inventory:write');
  const canExport = hasPermission('inventory:export') || hasPermission('inventory:read');

  const list = useStockAllocations();
  const {
    items,
    pagination,
    search,
    setSearch,
    clearSearch,
    sorting,
    filters,
    replaceFilters,
    isLoading,
    isFetching,
    isError,
  } = list;

  const rows: AllocationColumnRow[] = (items ?? EMPTY_ROWS) as AllocationColumnRow[];

  const mutations = useStockAllocationMutations();

  const warehouses = useWarehouses({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'stock-allocations',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.ALLOCATIONS}?${params.toString()}`);
      replaceFilters(viewFilters as Partial<StockAllocationFilters>);
    },
    [searchParams, router, replaceFilters],
  );

  const warehouseOptions = useMemo(
    () => (warehouses.items ?? []).map((w) => ({ value: w.id, label: w.name })),
    [warehouses.items],
  );

  const statusOpts = useMemo(
    () => Object.entries(ALLOCATION_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );

  const filterColumns = useMemo(
    (): ColumnConfig<AllocationColumnRow>[] => [
      hiddenSelectFilterColumn<AllocationColumnRow>({
        field: ALLOCATION_LIST_FILTER_FIELDS.status,
        headerName: 'Status',
        filterOptions: statusOpts,
      }),
      hiddenSelectFilterColumn<AllocationColumnRow>({
        field: ALLOCATION_LIST_FILTER_FIELDS.warehouseId,
        headerName: 'Warehouse',
        filterOptions: warehouseOptions,
      }),
    ],
    [statusOpts, warehouseOptions],
  );

  const columns = useMemo(
    () => [
      ...buildAllocationColumns({
        onView: (row) => router.push(ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', row.id)),
        onFulfill: (row) => {
          const remaining =
            Number(row.allocatedQuantity ?? 0) - Number(row.dispatchedQuantity ?? 0);
          if (remaining <= 0) return;
          if (typeof window !== 'undefined') {
            const ok = window.confirm(
              `Fulfill ${remaining} units for ${row.product?.name ?? 'allocation'}?`,
            );
            if (!ok) return;
          }
          void mutations.action('fulfill', row.id, {
            fulfilledQuantity: remaining,
            fulfillmentDate: new Date().toISOString().slice(0, 10),
          });
        },
        onCancel: (row) => {
          if (typeof window !== 'undefined') {
            const reason = window.prompt(`Cancel allocation? Optional reason:`, 'No longer needed');
            if (reason === null) return;
            void mutations.action('cancel', row.id, { reason: reason || 'Cancelled inline' });
          }
        },
        canWrite,
      }),
      ...filterColumns,
    ],
    [router, mutations, canWrite, filterColumns],
  );

  const filterModel = useMemo(
    () =>
      ({
        [ALLOCATION_LIST_FILTER_FIELDS.status]: (filters.status as string) ?? '',
        [ALLOCATION_LIST_FILTER_FIELDS.warehouseId]: (filters.warehouseId as string) ?? '',
      }) satisfies TableFilterModel,
    [filters.status, filters.warehouseId],
  );

  const onTableFilterChange = useCallback(
    (next: TableFilterModel) => {
      const out: Partial<StockAllocationFilters> = {};
      const st = next[ALLOCATION_LIST_FILTER_FIELDS.status];
      if (st) out.status = String(st) as StockAllocationFilters['status'];
      const wh = next[ALLOCATION_LIST_FILTER_FIELDS.warehouseId];
      if (wh) out.warehouseId = String(wh);
      replaceFilters(out);
    },
    [replaceFilters],
  );

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    (hasActive: boolean) =>
      hasActive ? (
        <EmptyState
          title="No matching allocations"
          description="Try clearing search and filters."
          action={{
            label: 'Clear search & filters',
            onClick: () => {
              replaceFilters({});
              clearSearch();
            },
          }}
        />
      ) : search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No allocations yet"
          description="Stock allocations are created from project BOMs."
        />
      ),
    [search, setSearch, replaceFilters, clearSearch],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
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
    [canExport, exporter.isDownloading, handleExport],
  );

  if (isError) {
    return (
      <ErrorState
        title="Failed to load allocations"
        description="Unable to load allocations. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Stock allocations</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'allocation' : 'allocations'}
          </MUITypography>
        </div>
      </div>

      <AllocationKpiStrip />

      <SavedViewsBar
        resource={'stock-allocations' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<AllocationColumnRow>
        key="allocations-table"
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
        filterModel={filterModel}
        onFilterChange={onTableFilterChange}
        onRowClick={(row) =>
          router.push(ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', row.id))
        }
        enableSearch
        enableFilters
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by product or project…"
        itemLabel="allocations"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
