'use client';

import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Link from 'next/link';

import { TRANSACTION_TYPE_LABEL } from '../constants';

import { MUITypography } from '@/components/ui/mui-typography';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/config/routes';
import { useInventoryStockList, type InventoryStock } from '@/lib/hooks/resources/inventory-stock';
import {
  useInventoryTransactions,
  type InventoryTransaction,
} from '@/lib/hooks/resources/inventory-transactions';
import { useMaterialDispatches } from '@/lib/hooks/resources/material-dispatches';
import { usePurchaseOrders, type PurchaseOrder } from '@/lib/hooks/resources/purchase-orders';

// ============================================================================
// Metric card
// ============================================================================

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  chipBg: string;
  chipColor: string;
  href: string;
  isLoading?: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  chipBg,
  chipColor,
  href,
  isLoading,
}: MetricCardProps) {
  return (
    <Link
      href={href}
      className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm hover:border-primary/30 transition-all group"
    >
      <div
        className={`shrink-0 rounded-lg p-2 ${chipBg} group-hover:scale-105 transition-transform`}
      >
        <Icon sx={{ fontSize: 16 }} className={chipColor} />
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xl font-semibold leading-none text-foreground">{value}</span>
          <span className="text-xs text-foreground-secondary truncate">{label}</span>
        </div>
      )}
    </Link>
  );
}

// ============================================================================
// Low-stock widget
// ============================================================================

function LowStockWidget() {
  const { items, isLoading } = useInventoryStockList({
    resource: 'dashboard-low-stock',
    defaultFilters: { lowStock: true } as Record<string, unknown>,
    defaultPageSize: 5,
    syncToUrl: false,
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <MUITypography variant="sectionTitle">Low Stock Alerts</MUITypography>
        <Link
          href={ROUTES.INVENTORY.ALERTS}
          className="text-xs text-primary flex items-center gap-0.5 hover:underline"
        >
          View all <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <MUITypography variant="body" className="text-foreground-secondary">
            All stock levels are healthy
          </MUITypography>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {items.map((item: InventoryStock) => (
            <div key={item.id} className="flex items-center justify-between py-2 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.product?.name ?? item.productId}
                </p>
                <p className="text-xs text-foreground-secondary truncate">
                  {item.warehouse?.name ?? item.warehouseId}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <WarningAmberOutlinedIcon sx={{ fontSize: 14 }} className="text-warning" />
                <span className="text-sm font-medium text-warning">{item.availableQuantity}</span>
                <span className="text-xs text-foreground-secondary">
                  / {item.minimumStockLevel} min
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Recent transactions widget
// ============================================================================

function RecentTransactionsWidget() {
  const { items, isLoading } = useInventoryTransactions({
    resource: 'dashboard-recent-transactions',
    defaultPageSize: 8,
    syncToUrl: false,
    defaultSort: { field: 'transactionDate', order: 'DESC' },
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <MUITypography variant="sectionTitle">Recent Transactions</MUITypography>
        <Link
          href={ROUTES.INVENTORY.TRANSACTIONS}
          className="text-xs text-primary flex items-center gap-0.5 hover:underline"
        >
          View all <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <MUITypography variant="body" className="text-foreground-secondary">
            No recent transactions
          </MUITypography>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {items.map((tx: InventoryTransaction) => {
            const isPositive = ['purchase', 'transfer_in', 'return'].includes(tx.transactionType);
            return (
              <div key={tx.id} className="flex items-center justify-between py-2 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tx.product?.name ?? tx.productId}
                  </p>
                  <p className="text-xs text-foreground-secondary truncate">
                    {TRANSACTION_TYPE_LABEL[tx.transactionType] ?? tx.transactionType}
                    {tx.warehouse ? ` · ${tx.warehouse.name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isPositive ? (
                    <TrendingUpIcon sx={{ fontSize: 14 }} className="text-success" />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 14 }} className="text-error" />
                  )}
                  <span
                    className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-error'}`}
                  >
                    {isPositive ? '+' : '-'}
                    {tx.quantity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pending POs widget
// ============================================================================

function PendingPosWidget() {
  const { items, isLoading } = usePurchaseOrders({
    resource: 'dashboard-pending-pos',
    defaultFilters: { status: 'pending_approval' } as Record<string, unknown>,
    defaultPageSize: 5,
    syncToUrl: false,
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <MUITypography variant="sectionTitle">Pending Purchase Orders</MUITypography>
        <Link
          href={ROUTES.INVENTORY.PURCHASE_ORDERS}
          className="text-xs text-primary flex items-center gap-0.5 hover:underline"
        >
          View all <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <MUITypography variant="body" className="text-foreground-secondary">
            No pending purchase orders
          </MUITypography>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {items.map((po: PurchaseOrder) => (
            <Link
              key={po.id}
              href={`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${po.id}`}
              className="flex items-center justify-between py-2 gap-2 hover:bg-surface-hover -mx-1 px-1 rounded transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{po.poNumber}</p>
                <p className="text-xs text-foreground-secondary truncate">
                  {po.vendor?.name ?? 'Unknown vendor'}
                </p>
              </div>
              <span className="text-sm font-medium text-foreground shrink-0">
                ₹{Number(po.totalAmount).toLocaleString('en-IN')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main dashboard
// ============================================================================

export function InventoryDashboard(): React.JSX.Element {
  const { pagination: stockPagination, isLoading: stockLoading } = useInventoryStockList({
    resource: 'dashboard-stock-count',
    defaultPageSize: 1,
    syncToUrl: false,
  });

  const { pagination: lowStockPagination, isLoading: lowStockLoading } = useInventoryStockList({
    resource: 'dashboard-low-stock-count',
    defaultFilters: { lowStock: true } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });

  const { pagination: poPagination, isLoading: poLoading } = usePurchaseOrders({
    resource: 'dashboard-po-count',
    defaultPageSize: 1,
    syncToUrl: false,
  });

  const { pagination: dispatchPagination, isLoading: dispatchLoading } = useMaterialDispatches({
    resource: 'dashboard-dispatch-count',
    defaultFilters: { status: 'in_transit' } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });

  const metrics: MetricCardProps[] = [
    {
      icon: InventoryOutlinedIcon,
      label: 'Total SKUs',
      value: stockPagination.total,
      chipBg: 'bg-primary/10',
      chipColor: 'text-primary',
      href: ROUTES.INVENTORY.LIST,
      isLoading: stockLoading,
    },
    {
      icon: WarningAmberOutlinedIcon,
      label: 'Low Stock Items',
      value: lowStockPagination.total,
      chipBg: 'bg-warning/10',
      chipColor: 'text-warning',
      href: ROUTES.INVENTORY.ALERTS,
      isLoading: lowStockLoading,
    },
    {
      icon: DescriptionOutlinedIcon,
      label: 'Purchase Orders',
      value: poPagination.total,
      chipBg: 'bg-info/10',
      chipColor: 'text-info',
      href: ROUTES.INVENTORY.PURCHASE_ORDERS,
      isLoading: poLoading,
    },
    {
      icon: LocalShippingOutlinedIcon,
      label: 'In Transit',
      value: dispatchPagination.total,
      chipBg: 'bg-success/10',
      chipColor: 'text-success',
      href: ROUTES.INVENTORY.DISPATCHES,
      isLoading: dispatchLoading,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <MUITypography variant="drawerTitle">Inventory</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Monitor stock levels, purchase orders, and dispatches
        </MUITypography>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LowStockWidget />
        <RecentTransactionsWidget />
        <PendingPosWidget />
      </div>
    </div>
  );
}
