'use client';

import * as React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
 * Recharts implementation behind `TrendLineChart`. Imported via
 * `next/dynamic({ ssr:false })` from the public wrapper so recharts
 * never runs during SSR (it ships a sizeable client bundle).
 *
 * Multi-series rendering: if any point carries a `series` field, we
 * pivot points into one line per distinct series. Otherwise we render
 * a single `value` line. Pivoting happens once per render via memo.
 */

export interface TrendLineChartImplProps
  extends Pick<ChartShellProps, 'title' | 'description' | 'height' | 'isLoading' | 'isEmpty' | 'error' | 'action' | 'className'> {
  data: ReadonlyArray<TrendPoint>;
  /** Override the y-axis tick formatter (e.g. for currency or percent). */
  yTickFormatter?: (value: number) => string;
  /** Format the tooltip value separately if it differs from axis ticks. */
  valueFormatter?: (value: number) => string;
  /** Render a horizontal grid for easier reading. Defaults to true. */
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

export function TrendLineChartImpl({
  data,
  yTickFormatter,
  valueFormatter,
  showGrid = true,
  ...shellProps
}: TrendLineChartImplProps): React.JSX.Element {
  const { rows, series } = React.useMemo(() => pivot(data), [data]);
  const isEmpty = shellProps.isEmpty ?? rows.length === 0;

  return (
    <ChartShell {...shellProps} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
          {series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconSize={8}
              iconType="circle"
            />
          )}
          {series.map((seriesKey, index) => (
            <Line
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              name={seriesKey === 'value' ? undefined : seriesKey}
              stroke={getChartColor(index)}
              strokeWidth={2}
              // Show explicit dots when there are few data points so a
              // single-point or two-point trend is visible at all.
              dot={rows.length <= 8 ? { r: 3, strokeWidth: 0 } : false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export default TrendLineChartImpl;
