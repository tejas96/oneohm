'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { DISPATCH_STATUS_LABEL } from '../constants';
import { buildDispatchColumns, type DispatchColumnRow } from './dispatches/dispatch-columns';
import { DispatchKpiStrip } from './dispatches/dispatch-kpi-strip';
import { hiddenSelectFilterColumn } from './shared/hidden-filter-column';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableFilterModel, TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useRegisteredResourceAccess } from '@/lib/hooks/core';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import {
  useMaterialDispatches,
  useMaterialDispatchMutations,
  type MaterialDispatchFilters,
} from '@/lib/hooks/resources/material-dispatches';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { useFeatureAccess } from '@/lib/hooks/use-feature-access';

const EMPTY_ROWS: DispatchColumnRow[] = [];

/** Hidden filter column `field` must not match a visible column `field` (table keys headers by `field`). */
const DISPATCH_LIST_FILTER_FIELDS = {
  status: 'filterStatus',
  warehouseId: 'warehouseId',
} as const;

/**
 * Dispatches list page (Part: rebuild-dispatch-pages).
 *
 * Mirrors PO/allocation list shape:
 * - DispatchKpiStrip with org-wide stats from /material-dispatches/stats/summary.
 * - AdvancedTable with status + warehouse filters and CSV export.
 * - Per-row RowActionMenu with permission-gated lifecycle actions:
 *   Mark dispatched / Mark delivered / Cancel. Mark-delivered is the
 *   one previously called out as flaky in the plan; it now goes through
 *   the generic `useMaterialDispatchMutations().action('markDelivered', …)`
 *   route — same path the detail page already uses successfully.
 * - SavedViewsBar wired (resource = "material-dispatches").
 */
export function InventoryDispatchesPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get('view');

  const dispatchAccess = useRegisteredResourceAccess('material-dispatches');
  const canExport = useFeatureAccess('inventory.export');
  const canWrite = dispatchAccess.canCreate || dispatchAccess.canUpdate;

  const list = useMaterialDispatches();
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

  const rows: DispatchColumnRow[] = (items ?? EMPTY_ROWS) as DispatchColumnRow[];

  const mutations = useMaterialDispatchMutations();

  const warehouses = useWarehouses({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'material-dispatches',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.DISPATCHES}?${params.toString()}`);
      replaceFilters(viewFilters as Partial<MaterialDispatchFilters>);
    },
    [searchParams, router, replaceFilters],
  );

  const warehouseOptions = useMemo(
    () => (warehouses.items ?? []).map((w) => ({ value: w.id, label: w.name })),
    [warehouses.items],
  );

  const dispatchStatusOpts = useMemo(
    () => Object.entries(DISPATCH_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );

  const filterColumns = useMemo(
    (): ColumnConfig<DispatchColumnRow>[] => [
      hiddenSelectFilterColumn<DispatchColumnRow>({
        field: DISPATCH_LIST_FILTER_FIELDS.status,
        headerName: 'Status',
        filterOptions: dispatchStatusOpts,
      }),
      hiddenSelectFilterColumn<DispatchColumnRow>({
        field: DISPATCH_LIST_FILTER_FIELDS.warehouseId,
        headerName: 'Warehouse',
        filterOptions: warehouseOptions,
      }),
    ],
    [dispatchStatusOpts, warehouseOptions],
  );

  const columns = useMemo(
    () => [
      ...buildDispatchColumns({
        onView: (row) => router.push(`${ROUTES.INVENTORY.DISPATCHES}/${row.id}`),
        onMarkDispatched: (row) => {
          if (
            typeof window !== 'undefined' &&
            !window.confirm(`Mark ${row.dispatchNumber} as dispatched?`)
          ) {
            return;
          }
          void mutations.action('markDispatched', row.id, {});
        },
        onMarkDelivered: (row) => {
          if (
            typeof window !== 'undefined' &&
            !window.confirm(`Mark ${row.dispatchNumber} as delivered today?`)
          ) {
            return;
          }
          void mutations.action('markDelivered', row.id, {
            actualDeliveryDate: new Date().toISOString().slice(0, 10),
          });
        },
        onCancel: (row) => {
          if (typeof window === 'undefined') return;
          const reason = window.prompt(
            `Cancel dispatch ${row.dispatchNumber}? Optional reason:`,
            'No longer needed',
          );
          if (reason === null) return;
          void mutations.action('cancel', row.id, { reason: reason || 'Cancelled inline' });
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
        [DISPATCH_LIST_FILTER_FIELDS.status]: (filters.status as string) ?? '',
        [DISPATCH_LIST_FILTER_FIELDS.warehouseId]: (filters.warehouseId as string) ?? '',
      }) satisfies TableFilterModel,
    [filters.status, filters.warehouseId],
  );

  const onTableFilterChange = useCallback(
    (next: TableFilterModel) => {
      const out: Partial<MaterialDispatchFilters> = {};
      const st = next[DISPATCH_LIST_FILTER_FIELDS.status];
      if (st) out.status = String(st);
      const wh = next[DISPATCH_LIST_FILTER_FIELDS.warehouseId];
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
          title="No matching dispatches"
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
          title="No dispatches yet"
          description="Create a dispatch to send allocated stock to a project site."
          action={
            canWrite
              ? {
                  label: 'Create Dispatch',
                  onClick: () => router.push(ROUTES.INVENTORY.DISPATCH_NEW),
                }
              : undefined
          }
        />
      ),
    [search, setSearch, router, canWrite, replaceFilters, clearSearch],
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
        title="Failed to load dispatches"
        description="Unable to load dispatches. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Material dispatches</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'dispatch' : 'dispatches'}
          </MUITypography>
        </div>
        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            size="small"
            onClick={() => router.push(ROUTES.INVENTORY.DISPATCH_NEW)}
          >
            Create Dispatch
          </Button>
        )}
      </div>

      <DispatchKpiStrip />

      <SavedViewsBar
        resource={'material-dispatches' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<DispatchColumnRow>
        key="dispatches-table"
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
        onRowClick={(row) => router.push(`${ROUTES.INVENTORY.DISPATCHES}/${row.id}`)}
        enableSearch
        enableFilters
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by dispatch number, project or vehicle…"
        itemLabel="dispatches"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
