'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { TrendChip } from './trend-chip';
import { money, type MoneyFormat } from '../lib/format';

import { CHART_COLORS } from '@/lib/charts/palette';
import type { PipelineFunnelStage, PipelineStatsResponse } from '@/lib/hooks/resources/pipeline';
import { color } from '@/lib/theme/tokens';

interface SalesPipelineCardProps {
  stages: PipelineFunnelStage[];
  lostCount: number;
  lostValue: number;
  stats: PipelineStatsResponse | undefined;
  wonCount: number;
  format: MoneyFormat;
  rangeLabel: string;
  isError: boolean;
  onRetry: () => void;
}

const ROW = 'grid grid-cols-[92px_42px_minmax(0,1fr)_100px_62px] items-center gap-x-3.5';

/**
 * The funnel, and the four figures that describe its health.
 *
 * Stage labels come from the API, never from a local list. The backend serves
 * four — New Leads, Qualified, Quote Sent, Won — and hard-coding them here is
 * how a screen ends up describing stages that no longer exist.
 *
 * The last stage is treated as "won" by position rather than by id, so adding
 * a stage upstream does not silently recolour the wrong bar.
 */
export function SalesPipelineCard({
  stages,
  lostCount,
  lostValue,
  stats,
  wonCount,
  format,
  rangeLabel,
  isError,
  onRetry,
}: SalesPipelineCardProps): React.JSX.Element {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const lastIndex = stages.length - 1;

  const health = stats
    ? [
        {
          label: 'Pipeline value',
          value: money(stats.totalPipelineValue, format),
          sub: '',
          metric: stats.trendVsPreviousPeriod.totalPipelineValue,
          upIsGood: true,
        },
        {
          label: 'Average deal',
          value: money(stats.avgDealSize, format),
          sub: 'won deals only',
          metric: stats.trendVsPreviousPeriod.avgDealSize,
          upIsGood: true,
        },
        {
          label: 'Win rate',
          value: `${stats.winRate}%`,
          sub: `${wonCount} won · ${lostCount} lost`,
          metric: stats.trendVsPreviousPeriod.winRate,
          upIsGood: true,
        },
        {
          label: 'Sales cycle',
          value: `${stats.avgSalesCycleDays} days`,
          sub: 'lead to won',
          // A shorter cycle is better, so a fall reads green.
          metric: stats.trendVsPreviousPeriod.avgSalesCycleDays,
          upIsGood: false,
        },
      ]
    : [];

  return (
    <BusinessCard
      label="Sales pipeline"
      aside={rangeLabel}
      isError={isError}
      onRetry={onRetry}
      errorHeight={320}
      link={{ label: 'Open pipeline', href: '/pipeline' }}
    >
      <div className="grid grid-cols-4 gap-x-5 pb-5">
        {health.map((item) => (
          <div key={item.label}>
            <div className="text-[11.5px] text-foreground-secondary">{item.label}</div>
            <div className="mt-1.5 text-[22px] font-bold tracking-[-0.03em] tabular-nums">
              {item.value}
            </div>
            <div className="mt-[5px] flex items-center gap-[7px]">
              <TrendChip metric={item.metric} upIsGood={item.upIsGood} />
              {item.sub ? (
                <span className="text-[11.5px] text-foreground-tertiary">{item.sub}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`${ROW} pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-foreground-tertiary`}
      >
        <div>Stage</div>
        <div className="text-right">Deals</div>
        <div />
        <div className="text-right">Value</div>
        <div className="text-right">vs prev</div>
      </div>

      {stages.map((stage, index) => {
        const negotiating = stage.negotiationCount ?? 0;
        return (
          <div key={stage.id}>
            <div className={`${ROW} h-[42px]`}>
              <div className="text-[13px] font-medium tracking-[-0.01em]">{stage.label}</div>
              <div className="text-right text-[14px] font-medium tabular-nums">{stage.count}</div>
              <div className="flex h-[22px] items-center">
                <div
                  className="h-[22px] rounded-pill"
                  style={{
                    width: `${Math.max(2, (stage.count / maxCount) * 100).toFixed(1)}%`,
                    background: index === lastIndex ? CHART_COLORS[1] : CHART_COLORS[2],
                  }}
                />
              </div>
              <div className="text-right font-mono text-[12.5px] tabular-nums text-foreground-secondary">
                {money(stage.value, format)}
              </div>
              <div className="text-right text-[12px] tabular-nums text-foreground-tertiary">
                {stage.conversionRateFromPrevious === null
                  ? '—'
                  : `${stage.conversionRateFromPrevious}%`}
              </div>
            </div>
            {negotiating > 0 ? (
              <div className={`${ROW} pb-2.5`}>
                <div />
                <div />
                <div className="text-[11.5px]" style={{ color: color.warning }}>
                  {negotiating} in negotiation past 7 days
                  {stage.negotiationValue ? ` · ${money(stage.negotiationValue, format)}` : ''}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <p className="pt-2.5 text-[12.5px] text-foreground-secondary">
        Lost this period <span className="font-medium tabular-nums">{lostCount}</span> ·{' '}
        <span className="tabular-nums">{money(lostValue, format)}</span>
      </p>
    </BusinessCard>
  );
}
