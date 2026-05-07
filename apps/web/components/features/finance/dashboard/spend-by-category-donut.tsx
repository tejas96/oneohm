'use client';

import { EXPENSE_CATEGORY_LABELS } from '@oneohm-epc/shared/constants';
import { formatCurrency, formatCurrencyCompact } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { DonutChart, type TopItem } from '@/components/shared/inventory';
import type { DashboardSpendByCategory } from '@/lib/hooks/resources';

/**
 * Spend-by-category donut for the selected date range. Centre label is
 * the grand total of the slices (so users always see a sum even when
 * the legend is collapsed). We map raw enum codes to friendly labels
 * via the shared `EXPENSE_CATEGORY_LABELS`; backend already returns
 * categories de-duplicated.
 */
export interface SpendByCategoryDonutProps {
  data: DashboardSpendByCategory[];
  isLoading?: boolean;
}

export function SpendByCategoryDonut({
  data,
  isLoading,
}: SpendByCategoryDonutProps): React.JSX.Element {
  const items = React.useMemo<TopItem[]>(
    () =>
      data.map((d) => {
        const label: string = EXPENSE_CATEGORY_LABELS[d.category] ?? d.category;
        return { id: d.category, label, value: d.total };
      }),
    [data],
  );

  const total = React.useMemo(() => data.reduce((sum, d) => sum + d.total, 0), [data]);

  return (
    <DonutChart
      title="Spend by Category"
      description="In selected range"
      height={280}
      isLoading={isLoading}
      isEmpty={!isLoading && items.length === 0}
      data={items}
      centerLabel={formatCurrencyCompact(total)}
      centerSubLabel="Total Spend"
      valueFormatter={(v: number) => formatCurrency(v)}
    />
  );
}
