'use client';

import * as React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';


import { ChartShell, type ChartShellProps } from './chart-shell';
import type { TopItem } from './types';

import { CHART_TOOLTIP_CURSOR, getChartColor } from '@/lib/charts';

/**
 * Donut chart for share-of-total breakdowns (e.g. spend by warehouse,
 * stock value by category). The centre label shows the grand total —
 * caller controls how that total is formatted (currency, count, etc).
 *
 * v1 deliberately doesn't auto-collapse small slices into "Other" —
 * the backend stats endpoints already cap at `limit` so the input list
 * is bounded. If you need bucketing, do it before passing the data in.
 */

export interface DonutChartImplProps
  extends Pick<ChartShellProps, 'title' | 'description' | 'height' | 'isLoading' | 'isEmpty' | 'error' | 'action' | 'help' | 'className'> {
  data: ReadonlyArray<TopItem>;
  /** Centre label (typically the grand total formatted with currency or units). */
  centerLabel?: string;
  /** Sub-label rendered under the centre value (e.g. "Total spend"). */
  centerSubLabel?: string;
  valueFormatter?: (value: number) => string;
}

export function DonutChartImpl({
  data,
  centerLabel,
  centerSubLabel,
  valueFormatter,
  ...shellProps
}: DonutChartImplProps): React.JSX.Element {
  const isEmpty = shellProps.isEmpty ?? data.length === 0;

  return (
    <ChartShell {...shellProps} isEmpty={isEmpty}>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...data]}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell key={item.id} fill={getChartColor(index)} />
              ))}
            </Pie>
            <Tooltip
              cursor={CHART_TOOLTIP_CURSOR}
              formatter={(value) =>
                typeof value === 'number' && valueFormatter ? valueFormatter(value) : String(value)
              }
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>

        {(centerLabel || centerSubLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && (
              <span className="text-lg font-semibold text-foreground">{centerLabel}</span>
            )}
            {centerSubLabel && (
              <span className="text-2xs uppercase tracking-wide text-foreground-tertiary">
                {centerSubLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </ChartShell>
  );
}

export default DonutChartImpl;
