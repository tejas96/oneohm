'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { ALLOCATION_STATUS_LABEL, ALLOCATION_STATUS_COLOR } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import {
  useStockAllocations,
  type StockAllocation,
  type StockAllocationFilters,
} from '@/lib/hooks/resources/stock-allocations';

type AllocationRow = StockAllocation & Record<string, unknown>;

const EMPTY_ROWS: AllocationRow[] = [];

const COLUMNS: ColumnConfig<AllocationRow>[] = [
  {
    field: 'product.name',
    headerName: 'Product',
    flex: 2,
    renderCell: ({ row }) => (
      <div className="flex flex-col gap-0.5 py-1">
        <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
        <span className="text-xs text-foreground-secondary">{row.product?.code ?? ''}</span>
      </div>
    ),
  },
  {
    field: 'project.name',
    headerName: 'Project',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{row.project?.name ?? '—'}</span>
    ),
  },
  {
    field: 'warehouse.name',
    headerName: 'Warehouse',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.warehouse?.name ?? '—'}</span>
    ),
  },
  {
    field: 'allocatedQuantity',
    headerName: 'Allocated',
    width: 110,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">{row.allocatedQuantity}</span>
    ),
  },
  {
    field: 'dispatchedQuantity',
    headerName: 'Dispatched',
    width: 110,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.dispatchedQuantity}</span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 160,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={ALLOCATION_STATUS_LABEL[row.status as string] ?? row.status}
        color={ALLOCATION_STATUS_COLOR[row.status as string] ?? 'default'}
      />
    ),
  },
];

export function InventoryAllocationsPage(): React.JSX.Element {
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
  } = useStockAllocations();

  const rows: AllocationRow[] = (items ?? EMPTY_ROWS) as AllocationRow[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No allocations yet"
          description="Stock allocations are created from project BOMs."
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
          options={Object.entries(ALLOCATION_STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilter(
              'status',
              (value === 'all' ? undefined : value) as StockAllocationFilters['status'],
            );
          }}
          allLabel="All statuses"
        />
      </div>
    ),
    [filters.status, setFilter],
  );

  if (isError) {
    return <ErrorState title="Failed to load allocations" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <MUITypography variant="drawerTitle">Stock Allocations</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary">
          {pagination.total} allocations
        </MUITypography>
      </div>

      <AdvancedTable<AllocationRow>
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
          void router.push(ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', row.id));
        }}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by product or project..."
        itemLabel="allocations"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
