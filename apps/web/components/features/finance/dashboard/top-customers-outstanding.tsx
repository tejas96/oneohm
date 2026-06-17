'use client';

import { formatCurrencyCompact } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { HorizontalBarChart, type TopItem } from '@/components/shared/inventory';
import { ROUTES } from '@/lib/config/routes';
import type { DashboardTopCustomer } from '@/lib/hooks/resources';

/**
 * Top-5 customers by outstanding balance (point-in-time, ignores the
 * date range picker — outstanding is "what we are owed right now",
 * not "what was owed during this range").
 *
 * Click on a bar (or the "View all" action) routes to the Customers AR
 * page until the per-customer drawer ships in slice 9. We surface the
 * limit with a "Top 5" suffix in the description so users don't think
 * the universe of debtors is just five.
 */
export interface TopCustomersOutstandingProps {
  data: DashboardTopCustomer[];
  isLoading?: boolean;
}

export function TopCustomersOutstanding({
  data,
  isLoading,
}: TopCustomersOutstandingProps): React.JSX.Element {
  const router = useRouter();

  const items = React.useMemo<TopItem[]>(
    () =>
      data.map((d) => ({
        id: d.customerId,
        label: d.customerName,
        value: d.outstanding,
      })),
    [data],
  );

  return (
    <HorizontalBarChart
      title="Top Customers Outstanding"
      description="Top 5 by amount owed (point-in-time)"
      height={280}
      isLoading={isLoading}
      isEmpty={!isLoading && items.length === 0}
      data={items}
      labelWidth={140}
      xTickFormatter={(v: number) => formatCurrencyCompact(v)}
      valueFormatter={(v: number) => formatCurrencyCompact(v)}
      action={
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => router.push(ROUTES.FINANCE.CUSTOMERS)}
        >
          View all
        </button>
      }
    />
  );
}
