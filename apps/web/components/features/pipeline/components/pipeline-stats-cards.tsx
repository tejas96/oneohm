'use client';

import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { Skeleton } from '@mui/material';
import * as React from 'react';

import { HelpTooltip, MUITypography } from '@/components/ui';
import type { PipelineStatsResponse, PipelineTrendMetric } from '@/lib/hooks/resources/pipeline';
import { formatCurrency } from '@/lib/utils';

interface PipelineStatsCardsProps {
  stats: PipelineStatsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

interface StatCardConfig {
  title: string;
  value: string;
  trend?: PipelineTrendMetric;
  icon: React.ReactNode;
  helpText?: string;
}

function TrendBadge({ trend }: { trend: PipelineTrendMetric }): React.JSX.Element {
  const colorClass =
    trend.direction === 'up'
      ? 'text-success'
      : trend.direction === 'down'
        ? 'text-error'
        : trend.direction === 'new'
          ? 'text-info'
          : 'text-foreground-tertiary';

  const label =
    trend.direction === 'flat' ? '—' : trend.direction === 'new' ? 'New' : `${trend.value}%`;

  return <span className={`text-xs font-medium ${colorClass}`}>{label}</span>;
}

function StatCard({ title, value, trend, icon, helpText }: StatCardConfig): React.JSX.Element {
  return (
    <div className="rounded-lg shadow-e2 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex size-container-md items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
        {trend && <TrendBadge trend={trend} />}
      </div>
      <MUITypography variant="sectionTitle" className="text-foreground">
        {value}
      </MUITypography>
      <div className="mt-1 flex items-center gap-1">
        <MUITypography variant="timestamp" className="text-foreground-secondary">
          {title}
        </MUITypography>
        {helpText && <HelpTooltip content={helpText} />}
      </div>
    </div>
  );
}

export function PipelineStatsCards({
  stats,
  isLoading,
  isError,
  onRetry,
}: PipelineStatsCardsProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg shadow-e2 bg-white p-4 text-center">
        <MUITypography variant="body" className="text-foreground-secondary">
          Failed to load pipeline stats.
        </MUITypography>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg shadow-e2 bg-white p-4">
        <MUITypography variant="body" className="text-foreground-secondary">
          No stats available for the selected period.
        </MUITypography>
      </div>
    );
  }

  const cards: StatCardConfig[] = [
    {
      title: 'Active Quote Value',
      value: formatCurrency(stats.totalPipelineValue),
      trend: stats.trendVsPreviousPeriod.totalPipelineValue,
      icon: <TrendingUpRoundedIcon className="text-primary" fontSize="small" />,
      helpText:
        'Sum of quotes currently sent to or viewed by customers, awaiting their decision. ' +
        'Excludes draft quotes not yet sent, and deals already won or lost.',
    },
    {
      title: 'Average Deal Size',
      value: formatCurrency(stats.avgDealSize),
      trend: stats.trendVsPreviousPeriod.avgDealSize,
      icon: <AttachMoneyRoundedIcon className="text-info" fontSize="small" />,
      helpText: 'Average final quote value across deals won in the selected period.',
    },
    {
      title: 'Win Rate',
      value: `${stats.winRate}%`,
      trend: stats.trendVsPreviousPeriod.winRate,
      icon: <EmojiEventsRoundedIcon className="text-success" fontSize="small" />,
      helpText:
        'Won deals as a percentage of all decided deals (won + lost). Open deals are excluded.',
    },
    {
      title: 'Avg. Sales Cycle',
      value: `${stats.avgSalesCycleDays} days`,
      trend: stats.trendVsPreviousPeriod.avgSalesCycleDays,
      icon: <AccessTimeRoundedIcon className="text-warning" fontSize="small" />,
      helpText:
        'Average days from lead creation to quote acceptance, for deals won in the selected period.',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
}
