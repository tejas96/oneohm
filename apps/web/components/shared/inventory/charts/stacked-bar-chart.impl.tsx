'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';


import { ChartShell, type ChartShellProps } from './chart-shell';
import type { TrendPoint } from './types';

import {
  CHART_AXIS_TICK_STYLE,
  CHART_TOOLTIP_CURSOR,
  getChartColor,
} from '@/lib/charts';

/**
 * Stacked bar chart for transaction-type breakdowns over time. Same
 * pivot algorithm as `TrendLineChartImpl`: each `series` label becomes
 * a stacked bar segment.
 *
 * Dispatched separately from the line chart because the visual
 * grammar is different (bars convey count/volume, lines convey trend),
 * and the dashboard uses both at the same time.
 */

export interface StackedBarChartImplProps
  extends Pick<ChartShellProps, 'title' | 'description' | 'height' | 'isLoading' | 'isEmpty' | 'error' | 'action' | 'className'> {
  data: ReadonlyArray<TrendPoint>;
  yTickFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
  showGrid?: boolean;
}

interface PivotedRow {
  date: string;
  [seriesKey: string]: number | string;
}

function pivot(data: ReadonlyArray<TrendPoint>): { rows: PivotedRow[]; series: string[] } {
  const seriesSet = new Set<string>();
  const byDate = new Map<string, PivotedRow>();
  for (const point of data) {
    const key = point.series ?? 'value';
    seriesSet.add(key);
    const row = byDate.get(point.date) ?? { date: point.date };
    row[key] = point.value;
    byDate.set(point.date, row);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  for (const row of rows) {
    for (const key of seriesSet) {
      if (!(key in row)) row[key] = 0;
    }
  }
  return { rows, series: Array.from(seriesSet) };
}

export function StackedBarChartImpl({
  data,
  yTickFormatter,
  valueFormatter,
  showGrid = true,
  ...shellProps
}: StackedBarChartImplProps): React.JSX.Element {
  const { rows, series } = React.useMemo(() => pivot(data), [data]);
  const isEmpty = shellProps.isEmpty ?? rows.length === 0;

  return (
    <ChartShell {...shellProps} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />}
          <XAxis dataKey="date" tick={CHART_AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
          <YAxis
            tick={CHART_AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            tickFormatter={yTickFormatter}
            width={48}
          />
          <Tooltip
            cursor={CHART_TOOLTIP_CURSOR}
            formatter={(value) =>
              typeof value === 'number' && valueFormatter ? valueFormatter(value) : String(value)
            }
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((seriesKey, index) => (
            <Bar
              key={seriesKey}
              dataKey={seriesKey}
              name={seriesKey === 'value' ? undefined : seriesKey}
              stackId="stack"
              fill={getChartColor(index)}
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export default StackedBarChartImpl;
