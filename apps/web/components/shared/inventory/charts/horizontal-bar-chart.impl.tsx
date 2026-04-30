'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';


import { ChartShell, type ChartShellProps } from './chart-shell';
import type { TopItem } from './types';

import { CHART_AXIS_TICK_STYLE, CHART_TOOLTIP_CURSOR, getChartColor } from '@/lib/charts';

/**
 * Horizontal bar chart for "top N" lists — top vendors by spend, top
 * low-stock items, top warehouses by throughput. Bars are sized by
 * `value` and labelled with the item's `label`. We render bars in
 * input order so the caller controls the sort.
 *
 * Each bar gets its own colour from the rotating palette so the chart
 * reads visually distinct (vs every bar in chart-1 green).
 */

export interface HorizontalBarChartImplProps
  extends Pick<ChartShellProps, 'title' | 'description' | 'height' | 'isLoading' | 'isEmpty' | 'error' | 'action' | 'className'> {
  data: ReadonlyArray<TopItem>;
  xTickFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
  /** Width of the y-axis label column in px. Defaults to 120. */
  labelWidth?: number;
}

export function HorizontalBarChartImpl({
  data,
  xTickFormatter,
  valueFormatter,
  labelWidth = 120,
  ...shellProps
}: HorizontalBarChartImplProps): React.JSX.Element {
  const isEmpty = shellProps.isEmpty ?? data.length === 0;
  const dataAsMutable = React.useMemo(() => [...data], [data]);

  return (
    <ChartShell {...shellProps} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dataAsMutable}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
          <XAxis
            type="number"
            tick={CHART_AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            dataKey="label"
            type="category"
            tick={CHART_AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            width={labelWidth}
          />
          <Tooltip
            cursor={CHART_TOOLTIP_CURSOR}
            formatter={(value) =>
              typeof value === 'number' && valueFormatter ? valueFormatter(value) : String(value)
            }
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {dataAsMutable.map((item, index) => (
              <Cell key={item.id} fill={getChartColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export default HorizontalBarChartImpl;
