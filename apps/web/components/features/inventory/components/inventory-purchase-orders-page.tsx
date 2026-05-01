'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  PAYMENT_STATUS_LABEL,
  PO_STATUS_LABEL,
} from '../constants';
import { buildPoColumns, type PoColumnRow } from './po/po-columns';
import { PoKpiStrip } from './po/po-kpi-strip';
import { TableFilterSelect } from './shared/table-filter-select';

import { AdvancedTable } from '@/components/shared/advanced-table';
import type { TableSortModel } from '@/components/shared/advanced-table/types';
import { EmptyState, ErrorState, NoSearchResults } from '@/components/shared/feedback';
import { SavedViewsBar } from '@/components/shared/inventory/saved-views-bar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryExport } from '@/lib/hooks/resources/inventory-export';
import {
  usePurchaseOrders,
  usePurchaseOrderMutations,
  type PurchaseOrderFilters,
} from '@/lib/hooks/resources/purchase-orders';
import { useVendors } from '@/lib/hooks/resources/vendors';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: PoColumnRow[] = [];

/**
 * Purchase Orders list page (Part: rebuild-po-pages).
 *
 * KPI strip is org-wide (vs page-scoped on stock list) because PO
 * operators need approval/overdue counts regardless of the current
 * filter slice. Status filter is supplemented by paymentStatus,
 * vendor, warehouse, and a CSV export. Per-row RowActionMenu offers
 * approve / send / cancel inline, all permission-gated.
 */
export function InventoryPurchaseOrdersPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get('view');

  const { hasPermission } = useAuth();
  const canCreate = hasPermission('purchase-order:write');
  const canWrite = canCreate;
  const canApprove =
    hasPermission('purchase-order:approve') || hasPermission('purchase-order:write');
  const canExport = hasPermission('inventory:export') || hasPermission('inventory:read');

  const list = usePurchaseOrders();
  const {
    items,
    pagination,
    search,
    setSearch,
    sorting,
    filters,
    setFilter,
    setFilters,
    isLoading,
    isFetching,
    isError,
  } = list;

  const rows: PoColumnRow[] = (items ?? EMPTY_ROWS) as PoColumnRow[];

  const mutations = usePurchaseOrderMutations();

  const vendors = useVendors({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });
  const warehouses = useWarehouses({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });

  const exporter = useInventoryExport();
  const handleExport = useCallback(async () => {
    await exporter.exportCsv({
      resource: 'purchase-orders',
      filters: filters as Record<string, string | number | boolean | undefined>,
    });
  }, [exporter, filters]);

  const handleViewSelect = useCallback(
    (id: string | null, viewFilters: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('view', id);
      else params.delete('view');
      params.delete('page');
      router.replace(`${ROUTES.INVENTORY.PURCHASE_ORDERS}?${params.toString()}`);
      setFilters(viewFilters as Partial<PurchaseOrderFilters>);
    },
    [searchParams, router, setFilters],
  );

  const columns = useMemo(
    () =>
      buildPoColumns({
        onView: (row) => router.push(`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${row.id}`),
        onApprove: (row) => {
          void mutations.action('approve', row.id);
        },
        onSend: (row) => {
          void mutations.action('send', row.id);
        },
        onCancel: (row) => {
          if (typeof window !== 'undefined') {
            const ok = window.confirm(
              `Cancel PO ${row.poNumber}? This will release any reserved stock and cannot be undone.`,
            );
            if (!ok) return;
          }
          void mutations.action('cancel', row.id);
        },
        canWrite,
        canApprove,
      }),
    [router, mutations, canWrite, canApprove],
  );

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
          action={
            canCreate
              ? {
                  label: 'Create PO',
                  onClick: () => router.push(ROUTES.INVENTORY.PURCHASE_ORDER_NEW),
                }
              : undefined
          }
        />
      ),
    [search, setSearch, router, canCreate],
  );

  const vendorOptions = useMemo(
    () =>
      (vendors.items ?? []).map((v) => ({
        value: v.id,
        label: v.name,
      })),
    [vendors.items],
  );
  const warehouseOptions = useMemo(
    () =>
      (warehouses.items ?? []).map((w) => ({
        value: w.id,
        label: w.name,
      })),
    [warehouses.items],
  );

  const toolbarActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
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
          minWidth={150}
        />
        <TableFilterSelect
          label="Payment"
          value={(filters.paymentStatus as string) || 'all'}
          options={Object.entries(PAYMENT_STATUS_LABEL ?? {}).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilter(
              'paymentStatus',
              (value === 'all' ? undefined : value) as PurchaseOrderFilters['paymentStatus'],
            );
          }}
          allLabel="All payments"
          minWidth={140}
        />
        <TableFilterSelect
          label="Vendor"
          value={(filters.vendorId as string) || ''}
          options={vendorOptions}
          onChange={(value) =>
            setFilter('vendorId', (value || undefined))
          }
          allLabel="All vendors"
          minWidth={170}
        />
        <TableFilterSelect
          label="Warehouse"
          value={(filters.warehouseId as string) || ''}
          options={warehouseOptions}
          onChange={(value) =>
            setFilter('warehouseId', (value || undefined))
          }
          allLabel="All warehouses"
          minWidth={170}
        />
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
    [
      filters.status,
      filters.paymentStatus,
      filters.vendorId,
      filters.warehouseId,
      vendorOptions,
      warehouseOptions,
      setFilter,
      canExport,
      exporter.isDownloading,
      handleExport,
    ],
  );

  if (isError) {
    return (
      <ErrorState
        title="Failed to load purchase orders"
        description="Unable to load purchase orders. Please try again."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="drawerTitle">Purchase Orders</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            {pagination.total} {pagination.total === 1 ? 'order' : 'orders'}
          </MUITypography>
        </div>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            size="small"
            onClick={() => router.push(ROUTES.INVENTORY.PURCHASE_ORDER_NEW)}
          >
            Create PO
          </Button>
        )}
      </div>

      <PoKpiStrip />

      <SavedViewsBar
        resource={'purchase-orders' as const}
        activeId={activeViewId}
        currentFilters={filters as Record<string, unknown>}
        onSelect={handleViewSelect}
      />

      <AdvancedTable<PoColumnRow>
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
          if (model)
            sorting.setSorting(model.field, model.direction === 'asc' ? 'ASC' : 'DESC');
          else sorting.clearSort();
        }}
        onSearchChange={setSearch}
        initialSearch={search}
        onRowClick={(row) => router.push(`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${row.id}`)}
        enableSearch
        enablePagination
        toolbarActions={toolbarActions}
        searchPlaceholder="Search by PO number…"
        itemLabel="orders"
        renderEmptyState={renderEmptyState}
      />
    </div>
  );
}
