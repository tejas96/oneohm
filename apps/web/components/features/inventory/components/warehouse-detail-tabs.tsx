'use client';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useCallback } from 'react';

import {
  ALLOCATION_STATUS_COLOR,
  ALLOCATION_STATUS_LABEL,
  TRANSACTION_TYPE_COLOR,
  TRANSACTION_TYPE_LABEL,
} from '../constants';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import {
  useInventoryStockList,
  useInventoryTransactions,
  useStockAllocations,
  type InventoryStock,
  type InventoryTransaction,
  type StockAllocation,
} from '@/lib/hooks/resources';

type StockRow = InventoryStock & Record<string, unknown>;
type TxRow = InventoryTransaction & Record<string, unknown>;
type AllocationRow = StockAllocation & Record<string, unknown>;

const EMPTY_STOCK: StockRow[] = [];
const EMPTY_TX: TxRow[] = [];
const EMPTY_ALLOC: AllocationRow[] = [];

const STOCK_COLUMNS: ColumnConfig<StockRow>[] = [
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
    field: 'availableQuantity',
    headerName: 'Available',
    width: 130,
    sortable: true,
    renderCell: ({ row }) => {
      const avail = Number(row.availableQuantity ?? 0);
      const min = Number(row.minimumStockLevel ?? 0);
      const isLow = min > 0 && avail <= min;
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
    headerName: 'Min level',
    width: 110,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.minimumStockLevel ?? '—'}</span>
    ),
  },
  {
    field: 'stockStatus',
    headerName: 'Status',
    width: 140,
    renderCell: ({ row }) => {
      const avail = Number(row.availableQuantity ?? 0);
      const reserved = Number(row.reservedQuantity ?? 0);
      const min = Number(row.minimumStockLevel ?? 0);
      const isLow = min > 0 && avail <= min;

      // Fully reserved (no available stock but has reservations)
      if (avail === 0 && reserved > 0) {
        return <MUIStatusChip label="Fully Reserved" color="warning" />;
      }

      // Out of stock
      if (avail === 0 && reserved === 0) {
        return <MUIStatusChip label="Out of Stock" color="error" />;
      }

      return (
        <MUIStatusChip
          label={isLow ? 'Low stock' : 'In stock'}
          color={isLow ? 'warning' : 'success'}
        />
      );
    },
  },
];

const TX_COLUMNS: ColumnConfig<TxRow>[] = [
  {
    field: 'transactionDate',
    headerName: 'Date',
    width: 140,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">
        {row.transactionDate
          ? new Date(row.transactionDate as string).toLocaleDateString('en-IN')
          : '—'}
      </span>
    ),
  },
  {
    field: 'transactionType',
    headerName: 'Type',
    width: 150,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={TRANSACTION_TYPE_LABEL[row.transactionType as string] ?? row.transactionType}
        color={TRANSACTION_TYPE_COLOR[row.transactionType as string] ?? 'default'}
      />
    ),
  },
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
    field: 'quantity',
    headerName: 'Quantity',
    width: 100,
    sortable: true,
    renderCell: ({ row }) => {
      const type = row.transactionType as string;
      const isPositive = ['purchase', 'transfer_in', 'return'].includes(type);
      const isNegative = ['dispatch', 'transfer_out', 'sale'].includes(type);
      const sign = isPositive ? '+' : isNegative ? '-' : '±';
      const tone = isPositive
        ? 'text-success'
        : isNegative
          ? 'text-error'
          : 'text-foreground-secondary';
      return (
        <span className={`text-sm font-medium ${tone}`}>
          {sign}
          {row.quantity}
        </span>
      );
    },
  },
  {
    field: 'referenceType',
    headerName: 'Reference',
    width: 140,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary capitalize">
        {row.referenceType ? String(row.referenceType).replace(/_/g, ' ') : '—'}
      </span>
    ),
  },
];

const ALLOCATION_COLUMNS: ColumnConfig<AllocationRow>[] = [
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

export function WarehouseStockTab({ warehouseId }: { warehouseId: string }): React.JSX.Element {
  const { items, pagination, search, setSearch, sorting, isLoading, isFetching, isError } =
    useInventoryStockList(
      {
        endpoint: `/inventory-stock/warehouse/${warehouseId}`,
        syncToUrl: false,
      },
      { enabled: Boolean(warehouseId) },
    );

  const rows = (items ?? EMPTY_STOCK) as StockRow[];
  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState title="No stock" description="There is no inventory in this warehouse yet." />
      ),
    [search, setSearch],
  );

  if (isError) {
    return <ErrorState title="Failed to load stock" description="Please try again." />;
  }

  return (
    <div className="p-4">
      <AdvancedTable<StockRow>
        columns={STOCK_COLUMNS}
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
        enableSearch
        enablePagination
        searchPlaceholder="Search by product..."
        itemLabel="stock lines"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}

export function WarehouseTransactionsTab({
  warehouseId,
}: {
  warehouseId: string;
}): React.JSX.Element {
  const { items, pagination, search, setSearch, sorting, isLoading, isFetching, isError } =
    useInventoryTransactions(
      {
        defaultFilters: { warehouseId },
        syncToUrl: false,
      },
      { enabled: Boolean(warehouseId) },
    );

  const rows = (items ?? EMPTY_TX) as TxRow[];
  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No transactions"
          description="Ledger entries for this warehouse will appear here."
        />
      ),
    [search, setSearch],
  );

  if (isError) {
    return <ErrorState title="Failed to load transactions" description="Please try again." />;
  }

  return (
    <div className="p-4">
      <AdvancedTable<TxRow>
        columns={TX_COLUMNS}
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
        enableSearch
        enablePagination
        searchPlaceholder="Search transactions..."
        itemLabel="transactions"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}

export function WarehouseAllocationsTab({
  warehouseId,
}: {
  warehouseId: string;
}): React.JSX.Element {
  const { items, pagination, search, setSearch, sorting, isLoading, isFetching, isError } =
    useStockAllocations(
      {
        defaultFilters: { warehouseId },
        syncToUrl: false,
      },
      { enabled: Boolean(warehouseId) },
    );

  const rows = (items ?? EMPTY_ALLOC) as AllocationRow[];
  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No allocations"
          description="Stock allocated to projects from this warehouse will appear here."
        />
      ),
    [search, setSearch],
  );

  if (isError) {
    return <ErrorState title="Failed to load allocations" description="Please try again." />;
  }

  return (
    <div className="p-4">
      <AdvancedTable<AllocationRow>
        columns={ALLOCATION_COLUMNS}
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
        enableSearch
        enablePagination
        searchPlaceholder="Search allocations..."
        itemLabel="allocations"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
