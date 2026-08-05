'use client';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { Button, IconButton, Tooltip } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { TRANSACTION_TYPE_COLOR, TRANSACTION_TYPE_LABEL } from '../constants';
import { hiddenSelectFilterColumn } from './shared/hidden-filter-column';
import { TransactionKpiStrip } from './transactions/transaction-kpi-strip';

import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
import type { TableFilterModel, TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useFeatureAccess } from '@/lib/hooks/use-feature-access';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import {
  useInventoryTransactions,
  type InventoryTransaction,
  type InventoryTransactionFilters,
} from '@/lib/hooks/resources/inventory-transactions';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { formatDate } from '@/lib/utils';

type TxRow = InventoryTransaction & Record<string, unknown>;

const EMPTY_ROWS: TxRow[] = [];

const POSITIVE_TYPES = new Set(['purchase', 'transfer_in', 'return']);
const NEGATIVE_TYPES = new Set(['dispatch', 'transfer_out']);

function referenceHref(row: InventoryTransaction): string | null {
  if (!row.referenceType || !row.referenceId) return null;
  switch (row.referenceType) {
    case 'purchase_order':
      return ROUTES.INVENTORY.PURCHASE_ORDER_DETAIL.replace('[id]', row.referenceId);
    case 'material_dispatch':
      return `${ROUTES.INVENTORY.DISPATCHES}/${row.referenceId}`;
    case 'stock_allocation':
      return ROUTES.INVENTORY.ALLOCATION_DETAIL.replace('[id]', row.referenceId);
    default:
      return null;
  }
}

const TX_LEDGER_DATA_COLUMNS: ColumnConfig<TxRow>[] = [
  {
    field: 'transactionDate',
    headerName: 'Date',
    width: 140,
    sortable: true,
    renderCell: ({ row }) => (
      <span className="text-sm text-foreground-secondary tabular-nums">
        {row.transactionDate ? formatDate(row.transactionDate as string) : '—'}
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
    renderCell: ({ row }) => {
      // For transfers, show "from → to" in a compact 2-line cell.
      if (row.transactionType === 'transfer_in' || row.transactionType === 'transfer_out') {
        return (
          <div className="flex flex-col gap-0.5 py-1 text-xs">
            <span className="text-foreground-secondary">
              {row.fromWarehouse?.name ?? row.warehouse?.name ?? '—'}
            </span>
            <span className="text-foreground-tertiary">→ {row.toWarehouse?.name ?? '—'}</span>
          </div>
        );
      }
      return (
        <span className="text-sm text-foreground-secondary">{row.warehouse?.name ?? '—'}</span>
      );
    },
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 110,
    sortable: true,
    renderCell: ({ row }) => {
      const qty = Number(row.quantity ?? 0);
      const unit = row.product?.unit ?? '';
      const isPositive = POSITIVE_TYPES.has(row.transactionType as string);
      const isNegative = NEGATIVE_TYPES.has(row.transactionType as string);
      const sign = isPositive ? '+' : isNegative ? '-' : '±';
      const tone = isPositive
        ? 'text-success'
        : isNegative
          ? 'text-error'
          : 'text-foreground-secondary';
      return (
        <span className={`block text-right text-sm font-medium tabular-nums ${tone}`}>
          {sign}
          {Math.abs(qty)}
          {unit ? ` ${unit}` : ''}
        </span>
      );
    },
  },
  {
    field: 'referenceType',
    headerName: 'Reference',
    width: 180,
    sortable: false,
    renderCell: ({ row }) => {
      const href = referenceHref(row);
      const label = row.referenceType ? String(row.referenceType).replace(/_/g, ' ') : '—';
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm capitalize text-foreground-secondary">{label}</span>
          {href ? (
            <Tooltip title="Open reference">
              <IconButton
                size="small"
                aria-label="Open reference"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(href, '_blank', 'noopener');
                }}
              >
                <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
      );
    },
  },
];

const REFERENCE_TYPE_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'stock_allocation', label: 'Stock Allocation' },
  { value: 'material_dispatch', label: 'Material Dispatch' },
  { value: 'warehouse_transfer', label: 'Warehouse Transfer' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
];

/** Filter-panel column `field` must differ from visible data columns — AdvancedTable keys headers by `field`. */
const TX_FILTER_FIELD = {
  transactionType: 'filterTransactionType',
  referenceType: 'filterReferenceType',
  warehouseId: 'warehouseId',
} as const;

/**
 * Inventory transactions ledger (Part: rebuild-transactions-page).
 * - TransactionKpiStrip (org-wide totals from
 *   /inventory-transactions/stats/summary).
 * - SavedViewsBar (resource = "inventory-transactions").
 * - AdvancedTable filter panel (type, reference, warehouse) + CSV export.
 * - Quantity column now respects sign by transaction type and shows
 *   `±` for adjustments (their direction is ambiguous in storage).
 * - Reference column gets an inline "open" button that deep-links to
 *   the source PO / dispatch / allocation in a new tab.
 */
export function InventoryTransactionsPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get('view');
  const canExport = useFeatureAccess('inventory.export');

  const list = useInventoryTransactions();
  const {
    items,
    pagination,
    search,
    setSearch,
    clearSearch,
    sorting,
    filters,
    replaceFilters,
    isLoading,
    isFetching,
    isError,
  } = list;

  const rows: TxRow[] = (items ?? EMPTY_ROWS) as TxRow[];

  const warehouses = useWarehouses({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'inventory-transactions',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.TRANSACTIONS}?${params.toString()}`);
      replaceFilters(viewFilters as Partial<InventoryTransactionFilters>);
    },
    [searchParams, router, replaceFilters],
  );

  const sortModel: TableSortModel | null = sorting.sortBy
    ? { field: sorting.sortBy, direction: sorting.sortOrder === 'ASC' ? 'asc' : 'desc' }
    : null;

  const warehouseOptions = useMemo(
    () => (warehouses.items ?? []).map((w) => ({ value: w.id, label: w.name })),
    [warehouses.items],
  );

  const transactionTypeFilterOptions = useMemo(
    () =>
      Object.entries(TRANSACTION_TYPE_LABEL).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const filterColumns = useMemo(
    (): ColumnConfig<TxRow>[] => [
      hiddenSelectFilterColumn<TxRow>({
        field: TX_FILTER_FIELD.transactionType,
        headerName: 'Type',
        filterOptions: transactionTypeFilterOptions,
      }),
      hiddenSelectFilterColumn<TxRow>({
        field: TX_FILTER_FIELD.referenceType,
        headerName: 'Reference type',
        filterOptions: REFERENCE_TYPE_FILTER_OPTIONS,
      }),
      hiddenSelectFilterColumn<TxRow>({
        field: TX_FILTER_FIELD.warehouseId,
        headerName: 'Warehouse',
        filterOptions: warehouseOptions,
      }),
    ],
    [transactionTypeFilterOptions, warehouseOptions],
  );

  const columns = useMemo(() => [...TX_LEDGER_DATA_COLUMNS, ...filterColumns], [filterColumns]);

  const filterModel = useMemo(
    () =>
      ({
        [TX_FILTER_FIELD.transactionType]: (filters.transactionType as string) ?? '',
        [TX_FILTER_FIELD.referenceType]: (filters.referenceType as string) ?? '',
        [TX_FILTER_FIELD.warehouseId]: (filters.warehouseId as string) ?? '',
      }) satisfies TableFilterModel,
    [filters.transactionType, filters.referenceType, filters.warehouseId],
  );

  const onTableFilterChange = useCallback(
    (next: TableFilterModel) => {
      const out: Partial<InventoryTransactionFilters> = {};
      const tt = next[TX_FILTER_FIELD.transactionType];
      if (typeof tt === 'string' && tt.trim()) out.transactionType = tt.trim();
      const rt = next[TX_FILTER_FIELD.referenceType];
      if (typeof rt === 'string' && rt.trim()) out.referenceType = rt.trim();
      const wh = next[TX_FILTER_FIELD.warehouseId];
      if (typeof wh === 'string' && wh.trim()) out.warehouseId = wh.trim();
      replaceFilters(out);
    },
    [replaceFilters],
  );

  const renderEmptyState = useCallback(
    (hasActive: boolean) =>
      hasActive ? (
        <EmptyState
          title="No matching transactions"
          description="Try clearing search and filters."
          action={{
            label: 'Clear search & filters',
            onClick: () => {
              replaceFilters({});
              clearSearch();
            },
          }}
        />
      ) : search ? (
        <NoSearchResults searchTerm={search} onClear={() => setSearch('')} />
      ) : (
        <EmptyState
          title="No transactions yet"
          description="Inventory transactions are recorded when stock moves in or out."
        />
      ),
    [search, setSearch, replaceFilters, clearSearch],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
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
    [canExport, exporter.isDownloading, handleExport],
  );

  if (isError) {
    return (
      <ErrorState
        title="Failed to load transactions"
        description="Unable to load transactions. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Transaction ledger</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'transaction' : 'transactions'}
          </MUITypography>
        </div>
      </div>

      <TransactionKpiStrip />

      <SavedViewsBar
        resource={'inventory-transactions' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<TxRow>
        key="transactions-table"
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
        filterModel={filterModel}
        onFilterChange={onTableFilterChange}
        enableSearch
        enableFilters
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by product or warehouse…"
        itemLabel="transactions"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
