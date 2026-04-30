'use client';

import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { VENDOR_STATUS_LABEL, VENDOR_TYPE_LABEL } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useVendors, type Vendor, type VendorFilters } from '@/lib/hooks/resources/vendors';

type VendorRow = Vendor & Record<string, unknown>;

const EMPTY_ROWS: VendorRow[] = [];

const COLUMNS: ColumnConfig<VendorRow>[] = [
  {
    field: 'name',
    headerName: 'Vendor',
    flex: 2,
    sortable: true,
    renderCell: ({ row }) => (
      <div className="flex flex-col gap-0.5 py-1">
        <span className="text-sm font-medium text-foreground">{row.name}</span>
        <span className="text-xs text-foreground-secondary">{row.code}</span>
      </div>
    ),
  },
  {
    field: 'vendorType',
    headerName: 'Type',
    width: 130,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground capitalize">{row.vendorType}</span>
    ),
  },
  {
    field: 'email',
    headerName: 'Email',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.email ?? '—'}</span>
    ),
  },
  {
    field: 'phone',
    headerName: 'Phone',
    width: 140,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.phone ?? '—'}</span>
    ),
  },
  {
    field: 'rating',
    headerName: 'Rating',
    width: 110,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground flex items-center gap-1">
        <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
        {row.rating != null ? Number(row.rating).toFixed(1) : '—'}
      </span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={row.status === 'active' ? 'Active' : 'Inactive'}
        color={row.status === 'active' ? 'success' : 'default'}
      />
    ),
  },
];

export function InventoryVendorsPage(): React.JSX.Element {
  const router = useRouter();
  const {
    items,
    pagination,
    search,
    setSearch,
    sorting,
    filters,
    setFilter,
    isLoading,
    isFetching,
    isError,
  } = useVendors();

  const rows: VendorRow[] = (items ?? EMPTY_ROWS) as VendorRow[];

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
          options={Object.entries(VENDOR_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            setFilter('status', (value === 'all' ? undefined : value) as VendorFilters['status']);
          }}
          allLabel="All statuses"
        />
        <TableFilterSelect
          label="Type"
          value={(filters.vendorType as string) || 'all'}
          options={Object.entries(VENDOR_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            setFilter(
              'vendorType',
              (value === 'all' ? undefined : value) as VendorFilters['vendorType'],
            );
          }}
          allLabel="All types"
        />
      </div>
    ),
    [filters.status, filters.vendorType, setFilter],
  );

  if (isError) {
    return <ErrorState title="Failed to load vendors" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Vendors</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {pagination.total} vendors
          </MUITypography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} size="small">
          Add Vendor
        </Button>
      </div>

      <AdvancedTable<VendorRow>
        columns={COLUMNS}
        rows={rows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        page={Math.max(pagination.page - 1, 0)}
        pageSize={pagination.pageSize}
        totalRowCount={pagination.total}
        sortModel={sortModel}
        onPageChange={(page) => {
          pagination.setPage(page + 1);
        }}
        onPageSizeChange={pagination.setPageSize}
        onSortChange={(model) => {
          if (model) sorting.setSorting(model.field, model.direction === 'asc' ? 'ASC' : 'DESC');
          else sorting.clearSort();
        }}
        onSearchChange={setSearch}
        onRowClick={(row) => {
          void router.push(ROUTES.INVENTORY.VENDOR_DETAIL.replace('[id]', row.id));
        }}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by name or code..."
        itemLabel="vendors"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
