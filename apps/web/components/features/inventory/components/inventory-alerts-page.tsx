'use client';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryStockList, type InventoryStock } from '@/lib/hooks/resources/inventory-stock';

type StockRow = InventoryStock & Record<string, unknown>;

const EMPTY_ROWS: StockRow[] = [];

const COLUMNS: ColumnConfig<StockRow>[] = [
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
      <span className="text-sm text-foreground">{row.warehouse?.name ?? '—'}</span>
    ),
  },
  {
    field: 'availableQuantity',
    headerName: 'Available',
    width: 130,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm font-medium text-warning flex items-center gap-1">
        <WarningAmberIcon sx={{ fontSize: 14 }} />
        {row.availableQuantity} {row.product?.unit ?? ''}
      </span>
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
    field: 'deficit',
    headerName: 'Deficit',
    width: 110,
    renderCell: ({ row }) => {
      const deficit = Number(row.minimumStockLevel ?? 0) - Number(row.availableQuantity);
      return <span className="text-sm font-medium text-error">{deficit > 0 ? deficit : '—'}</span>;
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
];

export function InventoryAlertsPage(): React.JSX.Element {
  const router = useRouter();

  const { items, pagination, search, setSearch, sorting, isLoading, isFetching, isError } =
    useInventoryStockList({
      resource: 'inventory-stock-alerts',
      defaultFilters: { lowStock: true } as Record<string, unknown>,
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
          title="No low stock alerts"
          description="All products are above their minimum stock levels. Great job!"
        />
      ),
    [search, setSearch],
  );

  if (isError) {
    return <ErrorState title="Failed to load alerts" description="Please try again." />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2 bg-warning/10">
          <WarningAmberIcon sx={{ fontSize: 20, color: 'var(--color-warning)' }} />
        </div>
        <div>
          <MUITypography variant="drawerTitle">Low Stock Alerts</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-0.5">
            {pagination.total} items below minimum stock level
          </MUITypography>
        </div>
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
        searchPlaceholder="Search by product or warehouse..."
        itemLabel="alerts"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
