'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useFmt } from './use-fmt';

import { KpiStripe, type MetricTileProps } from '@/components/shared/inventory';
import { ROUTES } from '@/lib/config/routes';
import {
  usePoSpendTrend,
  usePoOutstandingByVendor,
  type StatsWindowInput,
} from '@/lib/hooks/resources/inventory-stats';
import { useInventoryStockList } from '@/lib/hooks/resources/inventory-stock';
import { useMaterialDispatches } from '@/lib/hooks/resources/material-dispatches';
import { usePurchaseOrders } from '@/lib/hooks/resources/purchase-orders';
import { useStockAllocations } from '@/lib/hooks/resources/stock-allocations';
import { useVendors } from '@/lib/hooks/resources/vendors';

/**
 * KPI strip for the inventory dashboard.
 *
 * Eight tiles in a single responsive grid (1 col on phones, 4 on lg,
 * 8 on 2xl). Mix of two data sources:
 *
 *   1. Pagination-total counts (cheap pageSize=1 list call) for
 *      window-independent counters: Total SKUs, Low Stock, In Transit,
 *      Pending POs, Active Allocations, Active Vendors. We deliberately
 *      do NOT bind these to the time window — "how many vendors do we
 *      have" is not a time-bounded question and changing the picker
 *      shouldn't refetch them.
 *
 *   2. Stats endpoints (Part 10/12) for windowed financial metrics:
 *      Total PO Spend (sum of trend points) and Outstanding total
 *      (sum of outstanding-by-vendor items). Both honour the parent's
 *      TimeWindowPicker.
 *
 * Outstanding is labelled "(status-based)" per the plan's A2 decision:
 * the metric currently derives from PO status rather than the
 * paid_amount column added in Part 2, so we surface that caveat in the
 * tile's secondary line.
 */

interface DashboardKpiStripProps {
  statsWindow: StatsWindowInput;
}

export function DashboardKpiStrip({ statsWindow }: DashboardKpiStripProps): React.JSX.Element {
  const router = useRouter();
  const fmt = useFmt();

  // ---- Counts (window-independent) -----------------------------------------
  const stockTotal = useInventoryStockList({
    resource: 'dashboard-stock-count',
    defaultPageSize: 1,
    syncToUrl: false,
  });
  const lowStockTotal = useInventoryStockList({
    resource: 'dashboard-low-stock-count',
    defaultFilters: { lowStock: true } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });
  const inTransit = useMaterialDispatches({
    resource: 'dashboard-dispatch-in-transit',
    defaultFilters: { status: 'in_transit' } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });
  const pendingPos = usePurchaseOrders({
    resource: 'dashboard-po-pending',
    defaultFilters: { status: 'pending_approval' } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });
  const activeAllocations = useStockAllocations({
    resource: 'dashboard-alloc-active',
    defaultFilters: { status: 'active' } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });
  const activeVendors = useVendors({
    resource: 'dashboard-vendors-active',
    defaultFilters: { isActive: true } as Record<string, unknown>,
    defaultPageSize: 1,
    syncToUrl: false,
  });

  // ---- Window-bound financial metrics --------------------------------------
  const spendTrend = usePoSpendTrend({ window: statsWindow, bucket: 'day' });
  const outstandingByVendor = usePoOutstandingByVendor({ window: statsWindow, limit: 50 });

  const totalSpendValue = useMemo(() => {
    const points = spendTrend.data?.points ?? [];
    let sum = 0;
    for (const p of points) sum += p.value;
    return sum;
  }, [spendTrend.data]);

  const outstandingTotal = useMemo(() => {
    const items = outstandingByVendor.data?.items ?? [];
    let sum = 0;
    for (const it of items) sum += it.value;
    return sum;
  }, [outstandingByVendor.data]);

  const tiles = useMemo<ReadonlyArray<MetricTileProps & { id: string }>>(
    () => [
      {
        id: 'total-skus',
        label: 'Total SKUs',
        value: fmt.number(stockTotal.pagination.total),
        isLoading: stockTotal.isLoading,
        onClick: () => router.push(ROUTES.INVENTORY.LIST),
      },
      {
        id: 'low-stock',
        label: 'Low Stock',
        value: fmt.number(lowStockTotal.pagination.total),
        intent: lowStockTotal.pagination.total > 0 ? 'warning' : 'neutral',
        isLoading: lowStockTotal.isLoading,
        onClick: () => router.push(ROUTES.INVENTORY.ALERTS),
      },
      {
        id: 'in-transit',
        label: 'In Transit',
        value: fmt.number(inTransit.pagination.total),
        intent: 'info',
        isLoading: inTransit.isLoading,
        onClick: () => router.push(ROUTES.INVENTORY.DISPATCHES),
      },
      {
        id: 'pending-pos',
        label: 'Pending POs',
        value: fmt.number(pendingPos.pagination.total),
        intent: pendingPos.pagination.total > 0 ? 'warning' : 'neutral',
        isLoading: pendingPos.isLoading,
        onClick: () => router.push(ROUTES.INVENTORY.PURCHASE_ORDERS),
      },
      {
        id: 'po-spend',
        label: 'PO Spend',
        value: fmt.currency(totalSpendValue),
        isLoading: spendTrend.isLoading,
        secondary: 'in selected window',
      },
      {
        id: 'outstanding',
        label: 'Outstanding',
        value: fmt.currency(outstandingTotal),
        intent: outstandingTotal > 0 ? 'warning' : 'neutral',
        isLoading: outstandingByVendor.isLoading,
        secondary: 'status-based · A2',
      },
      {
        id: 'active-allocations',
        label: 'Active Allocations',
        value: fmt.number(activeAllocations.pagination.total),
        isLoading: activeAllocations.isLoading,
        onClick: () => router.push(ROUTES.INVENTORY.ALLOCATIONS),
      },
      {
        id: 'active-vendors',
        label: 'Active Vendors',
        value: fmt.number(activeVendors.pagination.total),
        isLoading: activeVendors.isLoading,
        onClick: () => router.push(ROUTES.INVENTORY.VENDORS),
      },
    ],
    [
      router,
      fmt,
      stockTotal.pagination.total,
      stockTotal.isLoading,
      lowStockTotal.pagination.total,
      lowStockTotal.isLoading,
      inTransit.pagination.total,
      inTransit.isLoading,
      pendingPos.pagination.total,
      pendingPos.isLoading,
      activeAllocations.pagination.total,
      activeAllocations.isLoading,
      activeVendors.pagination.total,
      activeVendors.isLoading,
      spendTrend.isLoading,
      outstandingByVendor.isLoading,
      totalSpendValue,
      outstandingTotal,
    ],
  );

  return <KpiStripe tiles={tiles} columns={8} />;
}
