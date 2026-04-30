'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { WAREHOUSE_STATUS_LABEL, WAREHOUSE_TYPE_LABEL } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import {
  useWarehouses,
  type Warehouse,
  type WarehouseFilters,
} from '@/lib/hooks/resources/warehouses';

type WarehouseRow = Warehouse & Record<string, unknown>;

const EMPTY_ROWS: WarehouseRow[] = [];

const COLUMNS: ColumnConfig<WarehouseRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
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
    field: 'warehouseType',
    headerName: 'Type',
    width: 130,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground capitalize">{row.warehouseType}</span>
    ),
  },
  {
    field: 'city',
    headerName: 'Location',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">
        {[row.city, row.state].filter(Boolean).join(', ') || '—'}
      </span>
    ),
  },
  {
    field: 'contactPerson',
    headerName: 'Contact',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.contactPerson ?? '—'}</span>
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

export function InventoryWarehousesPage(): React.JSX.Element {
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
  } = useWarehouses();

  const rows: WarehouseRow[] = (items ?? EMPTY_ROWS) as WarehouseRow[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No warehouses yet"
          description="Create your first warehouse to start managing inventory."
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
          options={Object.entries(WAREHOUSE_STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilter(
              'status',
              (value === 'all' ? undefined : value) as WarehouseFilters['status'],
            );
          }}
          allLabel="All statuses"
        />
        <TableFilterSelect
          label="Type"
          value={(filters.warehouseType as string) || 'all'}
          options={Object.entries(WAREHOUSE_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            setFilter(
              'warehouseType',
              (value === 'all' ? undefined : value) as WarehouseFilters['warehouseType'],
            );
          }}
          allLabel="All types"
        />
      </div>
    ),
    [filters.status, filters.warehouseType, setFilter],
  );

  if (isError) {
    return <ErrorState title="Failed to load warehouses" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Warehouses</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {pagination.total} warehouses
          </MUITypography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} size="small">
          Add Warehouse
        </Button>
      </div>

      <AdvancedTable<WarehouseRow>
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
          void router.push(ROUTES.INVENTORY.WAREHOUSE_DETAIL.replace('[id]', row.id));
        }}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by name or code..."
        itemLabel="warehouses"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
