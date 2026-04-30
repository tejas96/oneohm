'use client';

import { useCallback, useMemo } from 'react';

import { TRANSACTION_TYPE_LABEL, TRANSACTION_TYPE_COLOR } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  useInventoryTransactions,
  type InventoryTransactionFilters,
  type InventoryTransaction,
} from '@/lib/hooks/resources/inventory-transactions';

type TxRow = InventoryTransaction & Record<string, unknown>;

const EMPTY_ROWS: TxRow[] = [];

const COLUMNS: ColumnConfig<TxRow>[] = [
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
    field: 'warehouse.name',
    headerName: 'Warehouse',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">{row.warehouse?.name ?? '—'}</span>
    ),
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 100,
    sortable: true,
    renderCell: ({ row }) => {
      const isPositive = ['inward', 'transfer_in', 'return'].includes(
        row.transactionType as string,
      );
      return (
        <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-error'}`}>
          {isPositive ? '+' : '-'}
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

export function InventoryTransactionsPage(): React.JSX.Element {
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
  } = useInventoryTransactions();

  const rows: TxRow[] = (items ?? EMPTY_ROWS) as TxRow[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No transactions yet"
          description="Inventory transactions are recorded when stock moves in or out."
        />
      ),
    [search, setSearch],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TableFilterSelect
          label="Type"
          value={(filters.transactionType as string) || 'all'}
          options={[
            { value: 'purchase', label: 'Purchase' },
            { value: 'dispatch', label: 'Dispatch' },
            { value: 'transfer_in', label: 'Transfer In' },
            { value: 'transfer_out', label: 'Transfer Out' },
            { value: 'adjustment', label: 'Adjustment' },
            { value: 'allocation', label: 'Allocation' },
            { value: 'return', label: 'Return' },
          ]}
          onChange={(value) => {
            setFilter(
              'transactionType',
              (value === 'all'
                ? undefined
                : value) as InventoryTransactionFilters['transactionType'],
            );
          }}
          allLabel="All types"
        />
        <TableFilterSelect
          label="Reference"
          value={(filters.referenceType as string) || 'all'}
          options={[
            { value: 'purchase_order', label: 'Purchase Order' },
            { value: 'stock_allocation', label: 'Stock Allocation' },
            { value: 'material_dispatch', label: 'Material Dispatch' },
            { value: 'warehouse_transfer', label: 'Warehouse Transfer' },
            { value: 'manual_adjustment', label: 'Manual Adjustment' },
          ]}
          onChange={(value) => {
            setFilter(
              'referenceType',
              (value === 'all' ? undefined : value) as InventoryTransactionFilters['referenceType'],
            );
          }}
          allLabel="All references"
        />
      </div>
    ),
    [filters.referenceType, filters.transactionType, setFilter],
  );

  if (isError) {
    return <ErrorState title="Failed to load transactions" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Transaction Ledger</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {pagination.total} transactions
          </MUITypography>
        </div>
      </div>

      <AdvancedTable<TxRow>
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
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by product or warehouse..."
        itemLabel="transactions"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
