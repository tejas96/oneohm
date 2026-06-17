'use client';

import { formatCurrencyCompact } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { HorizontalBarChart, type TopItem } from '@/components/shared/inventory';
import { ROUTES } from '@/lib/config/routes';
import type { DashboardTopVendor } from '@/lib/hooks/resources';

/**
 * Top-5 vendors by spend in the selected date range.
 *
 * Vendor matching is by case-insensitive vendor name (project_expenses
 * has no FK to a vendor master in V1 — see the docs banner on the
 * Vendors page). We surface that nuance via the description so users
 * don't conflate this list with the inventory vendor catalog.
 */
export interface TopVendorsSpendProps {
  data: DashboardTopVendor[];
  isLoading?: boolean;
}

export function TopVendorsSpend({ data, isLoading }: TopVendorsSpendProps): React.JSX.Element {
  const router = useRouter();

  const items = React.useMemo<TopItem[]>(
    () =>
      data.map((d) => ({
        id: d.vendorKey,
        label: d.vendorName || '(unnamed vendor)',
        value: d.totalSpend,
      })),
    [data],
  );

  return (
    <HorizontalBarChart
      title="Top Vendors by Spend"
      description="Top 5 in selected range — name-matched"
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
          onClick={() => router.push(ROUTES.FINANCE.VENDORS)}
        >
          View all
        </button>
      }
    />
  );
}
