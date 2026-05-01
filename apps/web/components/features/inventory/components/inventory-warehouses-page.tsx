'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { WAREHOUSE_STATUS_LABEL, WAREHOUSE_TYPE_LABEL } from '../constants';
import { hiddenSelectFilterColumn } from './shared/hidden-filter-column';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { buildWarehouseColumns, type WarehouseColumnRow } from './warehouses/warehouse-columns';
import { WarehouseKpiStrip } from './warehouses/warehouse-kpi-strip';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableFilterModel, TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import { useStockSummaryByWarehouse } from '@/lib/hooks/resources/inventory-stock';
import {
  useWarehouses,
  type Warehouse,
  type WarehouseFilters,
} from '@/lib/hooks/resources/warehouses';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: WarehouseColumnRow[] = [];

const WAREHOUSE_LIST_FILTER_FIELDS = {
  status: 'filterStatus',
  warehouseType: 'filterWarehouseType',
} as const;

/**
 * Warehouses list page (Part: rebuild-warehouse-pages).
 *
 * Layout mirrors the new stock list:
 *   1. Header (title + "Add Warehouse" button — gated on inventory:write).
 *   2. WarehouseKpiStrip (page-scoped: count, active, SKU rows, value).
 *   3. SavedViewsBar (resource = "warehouses").
 *   4. AdvancedTable with type/status/country filters, CSV export,
 *      RowActionMenu per row.
 *
 * Why we join `useStockSummaryByWarehouse` into the page rather than
 * the columns module: the summary is keyed by warehouseId and used
 * both by the KPI strip (totals) and the SKU column (per-row bars).
 * Fetching it once at the page level keeps the columns module pure.
 */
export function InventoryWarehousesPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get('view');

  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory:write');
  const canEdit = canCreate;
  const canExport = hasPermission('inventory:export') || hasPermission('inventory:read');

  const list = useWarehouses();
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

  const rows: WarehouseColumnRow[] = (items ?? EMPTY_ROWS) as WarehouseColumnRow[];

  // Per-warehouse stock totals: used by the KPI strip and the SKU
  // column. Cached for 60s so paginating doesn't refetch every click.
  const stockSummary = useStockSummaryByWarehouse();

  // Form dialog state (covers both create and edit).
  const [formTarget, setFormTarget] = useState<Warehouse | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'warehouses',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.WAREHOUSES}?${params.toString()}`);
      replaceFilters(viewFilters as Partial<WarehouseFilters>);
    },
    [searchParams, router, replaceFilters],
  );

  const stockByWarehouseId = useMemo(() => {
    if (!stockSummary.data) return new Map<string, never>();
    return new Map(stockSummary.data.map((s) => [s.warehouseId, s]));
  }, [stockSummary.data]);

  const maxSkuRows = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      const summary = stockByWarehouseId.get(row.id);
      const items = Number(summary?.totalItems ?? 0);
      if (items > max) max = items;
    }
    return max;
  }, [rows, stockByWarehouseId]);

  const statusFilterOptions = useMemo(
    () => Object.entries(WAREHOUSE_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );
  const typeFilterOptions = useMemo(
    () => Object.entries(WAREHOUSE_TYPE_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );

  const filterColumns = useMemo(
    (): ColumnConfig<WarehouseColumnRow>[] => [
      hiddenSelectFilterColumn<WarehouseColumnRow>({
        field: WAREHOUSE_LIST_FILTER_FIELDS.status,
        headerName: 'Status',
        filterOptions: statusFilterOptions,
      }),
      hiddenSelectFilterColumn<WarehouseColumnRow>({
        field: WAREHOUSE_LIST_FILTER_FIELDS.warehouseType,
        headerName: 'Type',
        filterOptions: typeFilterOptions,
      }),
    ],
    [statusFilterOptions, typeFilterOptions],
  );

  const columns = useMemo(
    () => [
      ...buildWarehouseColumns(
        {
          onView: (row) => router.push(ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', row.id)),
          onEdit: (row) => {
            setFormTarget(row);
            setFormOpen(true);
          },
          canEdit,
        },
        stockByWarehouseId,
        maxSkuRows,
      ),
      ...filterColumns,
    ],
    [router, canEdit, stockByWarehouseId, maxSkuRows, filterColumns],
  );

  const filterModel = useMemo(
    () =>
      ({
        [WAREHOUSE_LIST_FILTER_FIELDS.status]: (filters.status as string) ?? '',
        [WAREHOUSE_LIST_FILTER_FIELDS.warehouseType]: (filters.warehouseType as string) ?? '',
      }) satisfies TableFilterModel,
    [filters.status, filters.warehouseType],
  );

  const onTableFilterChange = useCallback(
    (next: TableFilterModel) => {
      const out: Partial<WarehouseFilters> = {};
      const st = next[WAREHOUSE_LIST_FILTER_FIELDS.status];
      if (st) out.status = String(st);
      const wt = next[WAREHOUSE_LIST_FILTER_FIELDS.warehouseType];
      if (wt) out.warehouseType = String(wt);
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
          title="No matching warehouses"
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
          title="No warehouses yet"
          description="Create your first warehouse to start managing inventory."
        />
      ),
    [search, setSearch, replaceFilters, clearSearch],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
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
        title="Failed to load warehouses"
        description="Unable to load warehouses. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Warehouses</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'warehouse' : 'warehouses'}
          </MUITypography>
        </div>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            size="small"
            onClick={() => {
              setFormTarget(null);
              setFormOpen(true);
            }}
          >
            Add Warehouse
          </Button>
        )}
      </div>

      <WarehouseKpiStrip
        warehouses={rows}
        stockByWarehouse={stockSummary.data}
        totalRows={pagination.total}
        isLoading={isLoading || stockSummary.isLoading}
      />

      <SavedViewsBar
        resource={'warehouses' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<WarehouseColumnRow>
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
        onRowClick={(row) => router.push(ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', row.id))}
        enableSearch
        enableFilters
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by name or code…"
        itemLabel="warehouses"
        renderEmptyState={renderEmptyState}
      />

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setFormTarget(null);
        }}
        warehouse={formTarget ?? undefined}
      />
    </div>
  );
}
