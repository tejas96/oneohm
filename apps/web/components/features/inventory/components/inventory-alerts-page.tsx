'use client';

import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Button, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useFmt } from './dashboard/use-fmt';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { RowActionMenu, type RowAction } from '@/components/shared/inventory/row-action-menu';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useRegisteredResourceAccess } from '@/lib/hooks/core';
import { useInventoryStockList, type InventoryStock } from '@/lib/hooks/resources/inventory-stock';

type StockRow = InventoryStock & Record<string, unknown>;
const EMPTY_ROWS: StockRow[] = [];

/**
 * Build a deep-link to PO create that pre-seeds vendor/warehouse/product
 * via query string. The PO new page reads these to skip the manual
 * row entry. Quantity defaults to (reorderQuantity ?? deficit).
 */
function buildCreatePoHref(row: InventoryStock): string {
  const params = new URLSearchParams();
  if (row.warehouseId) params.set('warehouseId', row.warehouseId);
  if (row.productId) params.set('productId', row.productId);
  const deficit = Number(row.minimumStockLevel ?? 0) - Number(row.availableQuantity ?? 0);
  const qty = Number(row.reorderQuantity ?? 0) > 0 ? Number(row.reorderQuantity) : deficit;
  if (qty > 0) params.set('quantity', String(qty));
  params.set('source', 'low-stock-alert');
  return `${ROUTES.INVENTORY.PURCHASE_ORDER_NEW}?${params.toString()}`;
}

/**
 * Low stock alerts page (Part: rebuild-alerts-page).
 *
 * Adds a KPI summary above the existing low-stock list and a per-row
 * "Create PO" action that deep-links to PO new with the warehouse,
 * product, and suggested quantity prefilled. The PO create page is
 * gated by purchase-orders resource access.
 */
export function InventoryAlertsPage(): React.JSX.Element {
  const router = useRouter();
  const fmt = useFmt();
  const purchaseOrderAccess = useRegisteredResourceAccess('purchase-orders');
  const canCreatePo = purchaseOrderAccess.canCreate;

  const { items, pagination, search, setSearch, sorting, isLoading, isFetching, isError } =
    useInventoryStockList({
      resource: 'inventory-stock-alerts',
      defaultFilters: { lowStock: true } as Record<string, unknown>,
    });

  const rows: StockRow[] = (items ?? EMPTY_ROWS) as StockRow[];

  const aggregates = useMemo(() => {
    let totalDeficit = 0;
    let critical = 0;
    const warehouseSet = new Set<string>();
    for (const r of rows) {
      const min = Number(r.minimumStockLevel ?? 0);
      const avail = Number(r.availableQuantity ?? 0);
      const deficit = Math.max(0, min - avail);
      totalDeficit += deficit;
      if (avail <= 0) critical += 1;
      if (r.warehouseId) warehouseSet.add(r.warehouseId);
    }
    return { totalDeficit, critical, warehouses: warehouseSet.size };
  }, [rows]);

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const handleCreatePo = useCallback(
    (row: InventoryStock) => router.push(buildCreatePoHref(row)),
    [router],
  );

  const columns: ColumnConfig<StockRow>[] = useMemo(
    () => [
      {
        field: 'product.name',
        headerName: 'Product',
        flex: 2,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm font-medium text-foreground">{row.product?.name ?? '—'}</span>
            <span className="text-xs text-foreground-tertiary">{row.product?.code ?? ''}</span>
          </div>
        ),
      },
      {
        field: 'warehouse.name',
        headerName: 'Warehouse',
        flex: 1,
        sortable: false,
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
          const avail = Number(row.availableQuantity ?? 0);
          const tone = avail <= 0 ? 'text-error' : 'text-warning';
          return (
            <span className={`flex items-center gap-1 text-sm font-medium tabular-nums ${tone}`}>
              <WarningAmberRoundedIcon sx={{ fontSize: 14 }} />
              {avail} {row.product?.unit ?? ''}
            </span>
          );
        },
      },
      {
        field: 'minimumStockLevel',
        headerName: 'Min level',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="text-sm tabular-nums text-foreground-secondary">
            {row.minimumStockLevel ?? '—'}
          </span>
        ),
      },
      {
        field: 'deficit',
        headerName: 'Deficit',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => {
          const deficit = Number(row.minimumStockLevel ?? 0) - Number(row.availableQuantity ?? 0);
          return (
            <span className="text-sm font-medium tabular-nums text-error">
              {deficit > 0 ? deficit : '—'}
            </span>
          );
        },
      },
      {
        field: 'reorderQuantity',
        headerName: 'Reorder',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="text-sm tabular-nums text-foreground-secondary">
            {row.reorderQuantity ?? '—'}
          </span>
        ),
      },
      {
        field: 'reservedQuantity',
        headerName: 'Reserved',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="text-sm tabular-nums text-foreground-secondary">
            {row.reservedQuantity ?? 0}
          </span>
        ),
      },
      {
        field: '__actions',
        headerName: '',
        width: 56,
        sortable: false,
        renderCell: ({ row }) => {
          const actions: RowAction[] = [
            {
              id: 'view',
              label: 'View stock detail',
              icon: <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />,
              onSelect: () => router.push(ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id)),
            },
            {
              id: 'create-po',
              label: 'Create PO from this',
              icon: <AddShoppingCartRoundedIcon sx={{ fontSize: 16 }} />,
              onSelect: () => handleCreatePo(row),
              disabled: !canCreatePo,
              tooltip: !canCreatePo
                ? 'You need purchase-order:write to create a purchase order.'
                : undefined,
            },
            {
              id: 'open-stock',
              label: 'Open stock in new tab',
              icon: <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />,
              onSelect: () => {
                const href = ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id);
                window.open(href, '_blank', 'noopener');
              },
            },
          ];
          return (
            <div className="flex justify-center">
              <RowActionMenu
                actions={actions}
                ariaLabel={`Actions for ${row.product?.name ?? 'stock row'}`}
              />
            </div>
          );
        },
      },
    ],
    [router, handleCreatePo, canCreatePo],
  );

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
    return (
      <ErrorState
        title="Failed to load alerts"
        description="Unable to load alerts. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-warning/10 p-2">
            <WarningAmberRoundedIcon sx={{ fontSize: 20, color: 'var(--color-warning)' }} />
          </div>
          <div>
            <MUITypography variant="drawerTitle">Low stock alerts</MUITypography>
            <MUITypography variant="body" className="mt-0.5 text-foreground-secondary">
              {pagination.total} {pagination.total === 1 ? 'item' : 'items'} below minimum
            </MUITypography>
          </div>
        </div>
        {canCreatePo && rows.length > 0 ? (
          <Tooltip title="Open the PO create page (no row prefilled)">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddShoppingCartRoundedIcon sx={{ fontSize: 16 }} />}
                onClick={() => router.push(ROUTES.INVENTORY.PURCHASE_ORDER_NEW)}
              >
                Create PO
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </div>

      <KpiStripe
        tiles={[
          {
            id: 'al-total',
            label: 'Items below minimum',
            value: fmt.number(pagination.total),
            intent: pagination.total > 0 ? 'warning' : 'neutral',
            secondary: 'across all warehouses',
            isLoading,
          },
          {
            id: 'al-critical',
            label: 'Out of stock',
            value: fmt.number(aggregates.critical),
            intent: aggregates.critical > 0 ? 'danger' : 'neutral',
            secondary: 'available ≤ 0 (page)',
            isLoading,
          },
          {
            id: 'al-deficit',
            label: 'Total deficit (page)',
            value: fmt.number(aggregates.totalDeficit),
            secondary: 'sum of (min − available)',
            isLoading,
          },
          {
            id: 'al-warehouses',
            label: 'Warehouses affected',
            value: fmt.number(aggregates.warehouses),
            secondary: 'distinct on this page',
            isLoading,
          },
        ]}
      />

      <AdvancedTable<StockRow>
        key="alerts-table"
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
        onRowClick={(row) => router.push(ROUTES.INVENTORY.STOCK_DETAIL.replace('[id]', row.id))}
        enableSearch
        enablePagination
        searchPlaceholder="Search by product or warehouse…"
        itemLabel="alerts"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
