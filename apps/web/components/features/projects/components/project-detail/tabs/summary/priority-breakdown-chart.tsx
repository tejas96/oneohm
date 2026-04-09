'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import type { LookupOption } from '@/lib/hooks/resources';

/**
 * Chart color palette derived from the app's tailwind chart tokens.
 * Ordered: urgent-feeling colors first (red → orange → amber → green → blue).
 * When priority lookup colors are available they take full precedence.
 */
const CHART_PALETTE = [
  '#dc2626', // error  — Urgent / Critical
  '#f97316', // chart-5 orange — High
  '#eab308', // chart-3 amber — Medium
  '#76c044', // chart-1 primary green — Normal / Low
  '#0d74b8', // chart-2 secondary blue — Lowest
];

interface PriorityRow {
  key: string;
  name: string;
  count: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: PriorityRow }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const { name, count, color } = entry.payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-foreground">{name}</span>
        <span className="text-xs text-foreground-secondary ml-1">
          {count} {count === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  );
}

interface PriorityBreakdownChartProps {
  tasksByPriority: Record<string, number> | undefined;
  priorityLookupMap: Record<string, LookupOption>;
  isLoading: boolean;
}

export function PriorityBreakdownChart({
  tasksByPriority,
  priorityLookupMap,
  isLoading,
}: PriorityBreakdownChartProps) {
  const chartData = useMemo<PriorityRow[]>(() => {
    if (!tasksByPriority) return [];

    const allPriorities = Object.values(priorityLookupMap).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    const keys =
      allPriorities.length > 0 ? allPriorities.map((p) => p.value) : Object.keys(tasksByPriority);

    return keys.map((key, idx) => {
      const lookup = priorityLookupMap[key];
      const fallbackColor = CHART_PALETTE[idx % CHART_PALETTE.length] ?? '#94a3b8';
      return {
        key,
        name: lookup?.label ?? key,
        count: tasksByPriority[key] ?? 0,
        color: lookup?.color ?? fallbackColor,
      } satisfies PriorityRow;
    });
  }, [tasksByPriority, priorityLookupMap]);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border-light rounded-xl p-5">
        <Skeleton className="h-4 w-36 mb-5" />
        <div className="flex items-end gap-3 h-36 px-2">
          {[60, 85, 45, 70, 30].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-surface border border-border-light rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Priority Breakdown</p>
        <div className="flex items-center justify-center h-36 text-foreground-tertiary text-xs">
          No tasks yet
        </div>
      </div>
    );
  }

  const total = chartData.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);
  // Give 25% headroom above the tallest bar so LabelList values don't clip
  const yDomain: [number, number] = [0, Math.ceil(maxCount * 1.25)];

  return (
    <div className="bg-surface border border-border-light rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Priority Breakdown</p>
        <span className="text-xs text-foreground-tertiary">{total} total</span>
      </div>

      {/* Vertical bar chart — no layout="vertical" means bars grow upward */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 4, left: -28, bottom: 0 }}
          barCategoryGap="30%"
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.9} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 11, fontWeight: 600, fill: '#52525b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Dot legend with percentages */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border-light">
        {chartData.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.key} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-xs text-foreground-secondary">{row.name}</span>
              <span className="text-xs text-foreground-tertiary">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
