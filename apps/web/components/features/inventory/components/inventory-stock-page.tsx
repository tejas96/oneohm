'use client';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Chip } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import {
  useInventoryStockList,
  type InventoryStock,
  type InventoryStockFilters,
} from '@/lib/hooks/resources/inventory-stock';

type StockRow = InventoryStock & Record<string, unknown>;

const EMPTY_ROWS: StockRow[] = [];

const COLUMNS: ColumnConfig<StockRow>[] = [
  {
    field: 'product.name',
    headerName: 'Product',
    flex: 2,
    sortable: true,
    renderCell: ({ row }) => (
      <div className="flex flex-col gap-0.5 py-1">
        <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
        <span className="text-xs text-foreground-secondary">{row.product?.code ?? ''}</span>
      </div>
    ),
  },
  {
    field: 'warehouse.name',
    headerName: 'Warehouse',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{row.warehouse?.name ?? '—'}</span>
    ),
  },
  {
    field: 'availableQuantity',
    headerName: 'Available',
    width: 130,
    sortable: true,
    renderCell: ({ row }) => {
      const isLow = Number(row.availableQuantity) <= Number(row.minimumStockLevel ?? 0);
      return (
        <span
          className={`text-sm font-medium flex items-center gap-1 ${isLow ? 'text-warning' : 'text-foreground'}`}
        >
          {isLow && <WarningAmberIcon sx={{ fontSize: 14 }} />}
          {row.availableQuantity} {row.product?.unit ?? ''}
        </span>
      );
    },
  },
  {
    field: 'reservedQuantity',
    headerName: 'Reserved',
    width: 110,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.reservedQuantity}</span>
    ),
  },
  {
    field: 'minimumStockLevel',
    headerName: 'Min Level',
    width: 110,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.minimumStockLevel ?? '—'}</span>
    ),
  },
  {
    field: 'stockStatus',
    headerName: 'Status',
    width: 120,
    renderCell: ({ row }) => {
      const isLow = Number(row.availableQuantity) <= Number(row.minimumStockLevel ?? 0);
      return (
        <MUIStatusChip
          label={isLow ? 'Low Stock' : 'In Stock'}
          color={isLow ? 'warning' : 'success'}
        />
      );
    },
  },
];

export function InventoryStockPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLowStockFilter = searchParams.get('filter') === 'low-stock';

  const defaultFilters = useMemo(
    () => (isLowStockFilter ? { lowStock: true } : {}),
    [isLowStockFilter],
  );

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
  } = useInventoryStockList({
    defaultFilters: defaultFilters as Record<string, unknown>,
  });

  const rows: StockRow[] = (items ?? EMPTY_ROWS) as StockRow[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title={isLowStockFilter ? 'No low stock items' : 'No stock records'}
          description={
            isLowStockFilter
              ? 'All products are above minimum stock levels.'
              : 'Stock is added when a Purchase Order is received.'
          }
        />
      ),
    [search, setSearch, isLowStockFilter],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TableFilterSelect
          label="Stock Level"
          value={filters.lowStock ? 'low' : 'all'}
          options={[{ value: 'low', label: 'Low Stock Only' }]}
          onChange={(value) => {
            setFilter(
              'lowStock',
              (value === 'all' ? undefined : true) as InventoryStockFilters['lowStock'],
            );
          }}
          allLabel="All Levels"
          minWidth={190}
        />
      </div>
    ),
    [filters.lowStock, setFilter],
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
            {isLowStockFilter ? 'Low Stock Items' : 'Stock Levels'}
          </MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {pagination.total} items
          </MUITypography>
        </div>
        {isLowStockFilter && (
          <Chip
            icon={<WarningAmberIcon />}
            label="Low Stock Filter Active"
            color="warning"
            variant="outlined"
            size="small"
          />
        )}
      </div>

      <AdvancedTable<StockRow>
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
          void router.push(ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id));
        }}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by product or warehouse..."
        itemLabel="items"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
