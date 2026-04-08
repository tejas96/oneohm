'use client';

import type { TaskStatus, TaskStatusConfig } from '@oneohm-epc/shared/types';
import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import type { LookupByTypeCode } from '@/lib/hooks/resources';

const FALLBACK_COLOR = '#94a3b8';

interface StatusOverviewChartProps {
  tasksByStatus: Record<string, number> | undefined;
  taskStatuses: TaskStatusConfig[] | null | undefined;
  statusLookupMap: Record<string, LookupByTypeCode>;
  isLoading: boolean;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: { color: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="text-xs font-medium text-foreground">{entry.name}</span>
        <span className="text-xs text-foreground-secondary ml-1">{entry.value}</span>
      </div>
    </div>
  );
}

export function StatusOverviewChart({
  tasksByStatus,
  taskStatuses,
  statusLookupMap,
  isLoading,
}: StatusOverviewChartProps) {
  const chartData = useMemo(() => {
    if (!tasksByStatus) return [];
    return Object.entries(tasksByStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => {
        const projectStatus = taskStatuses?.find((s) => s.code === (status as TaskStatus));
        const color = projectStatus?.color ?? statusLookupMap[status]?.color ?? FALLBACK_COLOR;
        const label = projectStatus?.label ?? statusLookupMap[status]?.label ?? status;
        return { name: label, value: count, color, code: status };
      });
  }, [tasksByStatus, taskStatuses, statusLookupMap]);

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border-light rounded-xl p-5">
        <Skeleton className="h-4 w-32 mb-5" />
        <div className="flex items-center justify-center h-48">
          <Skeleton className="size-32 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-6 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-surface border border-border-light rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Status Overview</p>
        <div className="flex items-center justify-center h-48 text-foreground-tertiary text-xs">
          No tasks yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-light rounded-xl p-5">
      <p className="text-sm font-semibold text-foreground mb-4">Status Overview</p>

      <div className="flex items-center gap-4">
        {/* Donut chart */}
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.code}
                    fill={entry.color}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label — absolutely positioned over the SVG */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground leading-none">{total}</span>
            <span className="text-[11px] text-foreground-secondary mt-0.5">tasks</span>
          </div>
        </div>

        {/* Legend — vertical, scrollable if long */}
        <ul className="flex-1 space-y-2 overflow-y-auto max-h-[160px]">
          {chartData.map((entry) => {
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <li key={entry.code} className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-foreground truncate flex-1">{entry.name}</span>
                <span className="text-xs font-semibold text-foreground shrink-0">
                  {entry.value}
                </span>
                <span className="text-[11px] text-foreground-tertiary shrink-0 w-8 text-right">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
