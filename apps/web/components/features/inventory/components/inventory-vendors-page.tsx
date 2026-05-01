'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { VENDOR_STATUS_LABEL, VENDOR_TYPE_LABEL } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';
import { VendorFormDialog } from './vendor-form-dialog';
import { buildVendorColumns, type VendorColumnRow } from './vendors/vendor-columns';
import { VendorKpiStrip } from './vendors/vendor-kpi-strip';

import { AdvancedTable } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import { useVendors, type Vendor, type VendorFilters } from '@/lib/hooks/resources/vendors';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: VendorColumnRow[] = [];

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
    sorting,
    filters,
    setFilter,
    setFilters,
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
      setFilters(viewFilters as Partial<VendorFilters>);
    },
    [searchParams, router, setFilters],
  );

  const columns = useMemo(
    () =>
      buildVendorColumns({
        onView: (row) =>
          router.push(ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', row.id)),
        onEdit: (row) => {
          setFormTarget(row);
          setFormOpen(true);
        },
        canEdit,
      }),
    [router, canEdit],
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
          title="No vendors yet"
          description="Add vendors to manage procurement and purchase orders."
        />
      ),
    [search, setSearch],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TableFilterSelect
          label="Status"
          value={(filters.status as string) || 'all'}
          options={Object.entries(VENDOR_STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilter('status', (value === 'all' ? undefined : value) as VendorFilters['status']);
          }}
          allLabel="All statuses"
          minWidth={140}
        />
        <TableFilterSelect
          label="Type"
          value={(filters.vendorType as string) || 'all'}
          options={Object.entries(VENDOR_TYPE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilter(
              'vendorType',
              (value === 'all' ? undefined : value) as VendorFilters['vendorType'],
            );
          }}
          allLabel="All types"
          minWidth={150}
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
      filters.status,
      filters.vendorType,
      setFilter,
      canExport,
      exporter.isDownloading,
      handleExport,
    ],
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

      <VendorKpiStrip
        vendors={rows}
        totalRows={pagination.total}
        isLoading={isLoading}
      />

      <SavedViewsBar
        resource={'vendors' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<VendorColumnRow>
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
          if (model)
            sorting.setSorting(model.field, model.direction === 'asc' ? 'ASC' : 'DESC');
          else sorting.clearSort();
        }}
        onSearchChange={setSearch}
        initialSearch={search}
        onRowClick={(row) =>
          router.push(ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', row.id))
        }
        enableSearch
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
