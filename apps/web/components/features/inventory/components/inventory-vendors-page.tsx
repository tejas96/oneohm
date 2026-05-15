'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { VENDOR_STATUS_LABEL, VENDOR_TYPE_LABEL } from '../constants';
import { hiddenSelectFilterColumn } from './shared/hidden-filter-column';
import { VendorFormDialog } from './vendor-form-dialog';
import { buildVendorColumns, type VendorColumnRow } from './vendors/vendor-columns';
import { VendorKpiStrip } from './vendors/vendor-kpi-strip';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableFilterModel, TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import { useVendors, type Vendor, type VendorFilters } from '@/lib/hooks/resources/vendors';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: VendorColumnRow[] = [];

const VENDOR_LIST_FILTER_FIELDS = {
  status: 'filterStatus',
  vendorType: 'filterVendorType',
} as const;

/**
 * Vendors list page (Part: rebuild-vendor-pages).
 * Mirrors the warehouses rebuild: KPI strip, SavedViewsBar (resource =
 * "vendors"), AdvancedTable with status/type filters + CSV export +
 * RowActionMenu, Add Vendor button wired to VendorFormDialog.
 */
export function InventoryVendorsPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get('view');

  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory:write');
  const canEdit = canCreate;
  const canExport = hasPermission('inventory:export') || hasPermission('inventory:read');

  const list = useVendors();
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

  const rows: VendorColumnRow[] = (items ?? EMPTY_ROWS) as VendorColumnRow[];

  const [formTarget, setFormTarget] = useState<Vendor | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'vendors',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.VENDORS}?${params.toString()}`);
      replaceFilters(viewFilters as Partial<VendorFilters>);
    },
    [searchParams, router, replaceFilters],
  );

  const statusFilterOptions = useMemo(
    () => Object.entries(VENDOR_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );
  const typeFilterOptions = useMemo(
    () => Object.entries(VENDOR_TYPE_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );

  const filterColumns = useMemo(
    (): ColumnConfig<VendorColumnRow>[] => [
      hiddenSelectFilterColumn<VendorColumnRow>({
        field: VENDOR_LIST_FILTER_FIELDS.status,
        headerName: 'Status',
        filterOptions: statusFilterOptions,
      }),
      hiddenSelectFilterColumn<VendorColumnRow>({
        field: VENDOR_LIST_FILTER_FIELDS.vendorType,
        headerName: 'Type',
        filterOptions: typeFilterOptions,
      }),
    ],
    [statusFilterOptions, typeFilterOptions],
  );

  const columns = useMemo(
    () => [
      ...buildVendorColumns({
        onView: (row) => router.push(ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', row.id)),
        onEdit: (row) => {
          setFormTarget(row);
          setFormOpen(true);
        },
        canEdit,
      }),
      ...filterColumns,
    ],
    [router, canEdit, filterColumns],
  );

  const filterModel = useMemo(
    () =>
      ({
        [VENDOR_LIST_FILTER_FIELDS.status]: (filters.status as string) ?? '',
        [VENDOR_LIST_FILTER_FIELDS.vendorType]: (filters.vendorType as string) ?? '',
      }) satisfies TableFilterModel,
    [filters.status, filters.vendorType],
  );

  const onTableFilterChange = useCallback(
    (next: TableFilterModel) => {
      const out: Partial<VendorFilters> = {};
      const st = next[VENDOR_LIST_FILTER_FIELDS.status];
      if (st) out.status = String(st);
      const vt = next[VENDOR_LIST_FILTER_FIELDS.vendorType];
      if (vt) out.vendorType = String(vt);
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
          title="No matching vendors"
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
          title="No vendors yet"
          description="Add vendors to manage procurement and purchase orders."
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
        title="Failed to load vendors"
        description="Unable to load vendors. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Vendors</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'vendor' : 'vendors'}
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
            Add Vendor
          </Button>
        )}
      </div>

      <VendorKpiStrip vendors={rows} totalRows={pagination.total} isLoading={isLoading} />

      <SavedViewsBar
        resource={'vendors' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<VendorColumnRow>
        key="vendors-table"
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
        onRowClick={(row) => router.push(ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', row.id))}
        enableSearch
        enableFilters
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by name or code…"
        itemLabel="vendors"
        renderEmptyState={renderEmptyState}
      />

      <VendorFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setFormTarget(null);
        }}
        vendor={formTarget ?? undefined}
      />
    </div>
  );
}
