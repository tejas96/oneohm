'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { businessLinks, type BusinessRange } from '../lib/links';

import { CHART_COLORS } from '@/lib/charts/palette';
import type { PipelineTrendPoint } from '@/lib/hooks/resources/pipeline';
import { color } from '@/lib/theme/tokens';

const VIEW_W = 340;
const VIEW_H = 96;
const BASELINE_Y = 88;
const BAR_W = 8;
const MAX_H = 72;

interface Series {
  label: string;
  fill: string;
  total: number;
  peak: number;
  bars: Array<{ x: number; y: number; h: number; key: string }>;
}

interface LeadsWonCardProps {
  points: PipelineTrendPoint[];
  /** 'week' or 'month' — the API offers no daily grain for this series. */
  granularity: string;
  range: BusinessRange;
  isError: boolean;
  onRetry: () => void;
}

function buildSeries(
  label: string,
  points: PipelineTrendPoint[],
  pick: (p: PipelineTrendPoint) => number,
  fill: string,
): Series {
  const values = points.map(pick);
  const peak = Math.max(...values, 0) || 1;
  const colW = VIEW_W / Math.max(points.length, 1);
  return {
    label,
    fill,
    total: values.reduce((a, b) => a + b, 0),
    peak,
    bars: points.map((point, i) => {
      const h = (pick(point) / peak) * MAX_H;
      return {
        key: point.period,
        x: i * colW + (colW - BAR_W) / 2,
        y: BASELINE_Y - h,
        h,
      };
    }),
  };
}

/**
 * Two small bar charts sharing an axis range each, not one stacked chart.
 *
 * Leads and won are different orders of magnitude — stacking or overlaying them
 * makes the won series invisible. Separate charts with their own peak stated in
 * the header keep both readable and stop anyone reading the heights across.
 */
export function LeadsWonCard({
  points,
  granularity,
  range,
  isError,
  onRetry,
}: LeadsWonCardProps): React.JSX.Element {
  const series = React.useMemo(
    () => [
      buildSeries('Leads', points, (p) => p.leadsCount, CHART_COLORS[2]),
      buildSeries('Won', points, (p) => p.wonCount, CHART_COLORS[1]),
    ],
    [points],
  );

  // Buckets arrive as ISO dates. Rendered raw they read as "2026-07-28", which
  // is machine output on a card meant to be glanced at.
  const tick = (period: string | undefined): string => {
    if (!period) return '';
    const parsed = new Date(period);
    return Number.isNaN(parsed.getTime())
      ? period
      : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const first = tick(points[0]?.period);
  const last = tick(points[points.length - 1]?.period);

  return (
    <BusinessCard
      label="Leads vs won"
      aside={granularity === 'month' ? 'monthly' : 'weekly'}
      isError={isError}
      onRetry={onRetry}
      errorHeight={240}
      link={{ gate: 'pipeline.view', label: 'Open pipeline', href: businessLinks.pipeline(range) }}
    >
      {series.map((s) => (
        <div key={s.label}>
          <div className="flex items-baseline gap-2 pb-1.5">
            <span className="size-2 rounded-sm" style={{ background: s.fill }} aria-hidden="true" />
            <span className="text-[12.5px] text-foreground-secondary">{s.label}</span>
            <span className="text-[14px] font-medium tabular-nums">{s.total}</span>
            <span className="ml-auto font-mono text-[11px] text-foreground-tertiary">
              peak {s.peak}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            width="100%"
            height={VIEW_H}
            className="mb-3.5 block"
            role="img"
            aria-label={`${s.label}: ${s.total} in this period, peak ${s.peak}.`}
          >
            <line
              x1={0}
              y1={BASELINE_Y}
              x2={VIEW_W}
              y2={BASELINE_Y}
              stroke={color['chart-gridline']}
              strokeWidth={1}
            />
            {s.bars.map((bar) => (
              <rect
                key={bar.key}
                x={bar.x}
                y={bar.y}
                width={BAR_W}
                height={bar.h}
                rx={2}
                fill={s.fill}
              />
            ))}
          </svg>
        </div>
      ))}

      <div className="-mt-2 flex justify-between font-mono text-[9.5px] text-foreground-tertiary">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </BusinessCard>
  );
}
