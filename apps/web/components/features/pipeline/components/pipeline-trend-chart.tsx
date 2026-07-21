'use client';

import { Skeleton } from '@mui/material';
import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PIPELINE_CHART_COLORS } from '../constants';

import { MUITypography } from '@/components/ui';
import type { PipelineTrendPoint } from '@/lib/hooks/resources/pipeline';
import { formatDate } from '@/lib/utils';

interface PipelineTrendChartProps {
  points: PipelineTrendPoint[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function PipelineTrendChart({
  points,
  isLoading,
  isError,
  onRetry,
}: PipelineTrendChartProps): React.JSX.Element {
  const chartData = React.useMemo(
    () =>
      points.map((p) => ({
        ...p,
        label: formatDate(p.period, 'short'),
      })),
    [points],
  );

  if (isLoading) {
    return <Skeleton variant="rounded" height={280} className="rounded-lg" />;
  }

  if (isError) {
    return (
      <div className="rounded-lg shadow-e2 bg-white p-4 text-center">
        <MUITypography variant="body" className="text-foreground-secondary">
          Failed to load trend data.
        </MUITypography>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-primary">
          Retry
        </button>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg shadow-e2 bg-white p-4">
        <MUITypography variant="body" className="text-foreground-secondary">
          No trend data for the selected period.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-e2 bg-white p-4 shadow-sm">
      <MUITypography variant="sectionTitle" className="mb-4">
        Leads vs Won Over Time
      </MUITypography>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PIPELINE_CHART_COLORS.leads} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PIPELINE_CHART_COLORS.leads} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="wonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PIPELINE_CHART_COLORS.won} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PIPELINE_CHART_COLORS.won} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border-light" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="leadsCount"
            name="New Leads"
            stroke={PIPELINE_CHART_COLORS.leads}
            fill="url(#leadsGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="wonCount"
            name="Won"
            stroke={PIPELINE_CHART_COLORS.won}
            fill="url(#wonGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
