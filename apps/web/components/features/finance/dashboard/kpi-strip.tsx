'use client';

import { formatCurrency, formatCurrencyCompact, formatNumber } from '@oneohm-epc/shared/utils';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { KpiStripe, type MetricTileProps } from '@/components/shared/inventory';
import { ROUTES } from '@/lib/config/routes';
import type { DashboardKpis } from '@/lib/hooks/resources';

/**
 * Six-card KPI strip for the Finance dashboard.
 *
 * Three KPIs are window-scoped (revenue / spend / net cashflow — change
 * when the DateRangePicker changes); the remaining three are
 * point-in-time or trailing (outstanding now, overdue count now,
 * average days to collect over the trailing 90 days). Backend already
 * separates them in the DTO; we mirror that with `secondary` labels so
 * users understand why some tiles don't react to the picker.
 *
 * Each tile drills through to the corresponding ledger / insights page
 * with the appropriate filter pre-applied (where the destination page
 * supports it). For the trailing-90 KPI we send the user to Customers
 * AR since that's the page that explains the metric in context.
 */
export interface FinanceKpiStripProps {
  kpis?: DashboardKpis;
  isLoading?: boolean;
}

export function FinanceKpiStrip({ kpis, isLoading }: FinanceKpiStripProps): React.JSX.Element {
  const router = useRouter();

  const tiles: ReadonlyArray<MetricTileProps & { id: string }> = [
    {
      id: 'revenue',
      label: 'Revenue (Range)',
      value: kpis ? formatCurrencyCompact(kpis.revenueInRange) : '—',
      isLoading,
      secondary: 'Cleared receipts',
      onClick: () => router.push(ROUTES.FINANCE.RECEIPTS),
    },
    {
      id: 'spend',
      label: 'Spend (Range)',
      value: kpis ? formatCurrencyCompact(kpis.spendInRange) : '—',
      isLoading,
      secondary: 'Posted expenses',
      onClick: () => router.push(ROUTES.FINANCE.EXPENSES),
    },
    {
      id: 'net',
      label: 'Net Cash-flow',
      value: kpis ? formatCurrencyCompact(kpis.netCashflowInRange) : '—',
      intent: kpis && kpis.netCashflowInRange < 0 ? 'danger' : 'success',
      isLoading,
      secondary: 'In selected range',
    },
    {
      id: 'outstanding',
      label: 'Outstanding Now',
      value: kpis ? formatCurrency(kpis.outstandingNow) : '—',
      intent: kpis && kpis.outstandingNow > 0 ? 'warning' : 'neutral',
      isLoading,
      secondary: 'Across all open terms',
      onClick: () => router.push(ROUTES.FINANCE.OUTSTANDING),
    },
    {
      id: 'overdue',
      label: 'Overdue Count',
      value: kpis ? formatNumber(kpis.overdueCountNow) : '—',
      intent: kpis && kpis.overdueCountNow > 0 ? 'danger' : 'neutral',
      isLoading,
      secondary: 'Past due date',
      onClick: () => router.push(ROUTES.FINANCE.OUTSTANDING),
    },
    {
      id: 'avg-days',
      label: 'Avg Days to Collect',
      value: kpis ? `${formatNumber(Math.round(kpis.avgDaysToCollectTrailing90))} d` : '—',
      isLoading,
      secondary: 'Trailing 90 days',
      onClick: () => router.push(ROUTES.FINANCE.CUSTOMERS),
    },
  ];

  return <KpiStripe tiles={tiles} columns={6} />;
}
