'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { PO_STATUS_LABEL, PO_STATUS_COLOR } from '../constants';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import {
  usePurchaseOrders,
  type PurchaseOrder,
  type PurchaseOrderFilters,
} from '@/lib/hooks/resources/purchase-orders';
import { formatCurrency } from '@/lib/utils';

type PORow = PurchaseOrder & Record<string, unknown>;

const EMPTY_ROWS: PORow[] = [];

const COLUMNS: ColumnConfig<PORow>[] = [
  {
    field: 'poNumber',
    headerName: 'PO Number',
    flex: 1,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-primary">{row.poNumber}</span>
    ),
  },
  {
    field: 'vendor.name',
    headerName: 'Vendor',
    flex: 1,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground">{row.vendor?.name ?? '—'}</span>
    ),
  },
  {
    field: 'poDate',
    headerName: 'PO Date',
    width: 120,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">
        {row.poDate ? new Date(row.poDate as string).toLocaleDateString('en-IN') : '—'}
      </span>
    ),
  },
  {
    field: 'expectedDeliveryDate',
    headerName: 'Expected Delivery',
    width: 150,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary">
        {row.expectedDeliveryDate
          ? new Date(row.expectedDeliveryDate as string).toLocaleDateString('en-IN')
          : '—'}
      </span>
    ),
  },
  {
    field: 'totalAmount',
    headerName: 'Total',
    width: 130,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">
        {formatCurrency(Number(row.totalAmount))}
      </span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: ({ row }) => (
      <MUIStatusChip
        label={PO_STATUS_LABEL[row.status as string] ?? row.status}
        color={PO_STATUS_COLOR[row.status as string] ?? 'default'}
      />
    ),
  },
];

export function InventoryPurchaseOrdersPage(): React.JSX.Element {
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
  } = usePurchaseOrders();

  const rows: PORow[] = (items ?? EMPTY_ROWS) as PORow[];

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const renderEmptyState = useCallback(
    () =>
      search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No purchase orders"
          description="Create a purchase order to start receiving inventory."
          action={{
            label: 'Create PO',
            onClick: () => router.push(ROUTES.INVENTORY.PURCHASE_ORDER_NEW),
          }}
        />
      ),
    [search, setSearch, router],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TableFilterSelect
          label="Status"
          value={(filters.status as string) || 'all'}
          options={Object.entries(PO_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            setFilter(
              'status',
              (value === 'all' ? undefined : value) as PurchaseOrderFilters['status'],
            );
          }}
          allLabel="All statuses"
        />
      </div>
    ),
    [filters.status, setFilter],
  );

  if (isError) {
    return <ErrorState title="Failed to load purchase orders" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Purchase Orders</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            {pagination.total} orders
          </MUITypography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => router.push(ROUTES.INVENTORY.PURCHASE_ORDER_NEW)}
        >
          Create PO
        </Button>
      </div>

      <AdvancedTable<PORow>
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
          void router.push(`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${row.id}`);
        }}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by PO number or vendor..."
        itemLabel="orders"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
