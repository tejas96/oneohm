'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { money, type MoneyFormat } from '../lib/format';
import { businessLinks } from '../lib/links';

import { CHART_COLORS } from '@/lib/charts/palette';
import type { CashFlowPoint } from '@/lib/hooks/resources/ledger';
import { color } from '@/lib/theme/tokens';

// Geometry, transcribed from the design. The chart is drawn at a fixed
// viewBox and scaled by the browser, so these are design pixels.
const VIEW_W = 692;
const VIEW_H = 236;
const GUTTER = 38; // left space for the lakh axis labels
const ZERO_Y = 132; // the baseline money-in sits above and money-out below
const BAR_W = 13;
const MAX_UP = 108; // tallest a money-in bar may draw
const MAX_DOWN = 76; // tallest a money-out bar may draw
const PLOT_W = VIEW_W - GUTTER;

const LAKH = 1e5;

/** Axis steps in lakhs, chosen so at most ~3 gridlines appear per side. */
function niceStepLakhs(maxLakhs: number): number {
  const candidates = [0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000];
  for (const step of candidates) {
    if (maxLakhs / step <= 3.2) return step;
  }
  return 2500;
}

function axisLabel(lakhs: number): string {
  return `${lakhs >= 1 ? String(lakhs) : lakhs.toFixed(2)} L`;
}

/** Day number from a bucket key, which is a date for day/week grain. */
function bucketTick(bucket: string, index: number): string {
  const day = /^\d{4}-\d{2}-(\d{2})/.exec(bucket);
  return day?.[1] ? String(Number(day[1])) : String(index + 1);
}

interface CashFlowCardProps {
  points: CashFlowPoint[];
  net: number;
  format: MoneyFormat;
  rangeLabel: string;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Money in and money out, drawn around a shared zero line.
 *
 * Deliberately not a running-total line: the period's net is stated as a figure
 * in the header instead. A cumulative line invites "compared to what?", and no
 * finance endpoint returns a previous-period value to answer it.
 */
export function CashFlowCard({
  points,
  net,
  format,
  rangeLabel,
  isError,
  onRetry,
}: CashFlowCardProps): React.JSX.Element {
  const chart = React.useMemo(() => {
    const maxIn = Math.max(...points.map((p) => p.cashIn), 0) || 1;
    const maxOut = Math.max(...points.map((p) => p.cashOut), 0) || 1;
    // One shared scale for both directions, so a ₹5L receipt and a ₹5L payment
    // draw the same length. Scaling them independently would make a small
    // outflow look like a large one.
    const unit = Math.min(MAX_UP / maxIn, MAX_DOWN / maxOut);
    const colW = PLOT_W / Math.max(points.length, 1);

    // A non-zero amount always draws at least a sliver. The two directions share
    // one scale so lengths stay comparable, which means a ₹4k payment beside a
    // ₹4L receipt rounds to nothing — and "no bar" reads as "no payment", which
    // is a different and untrue statement.
    const visible = (raw: number): number => (raw > 0 ? Math.max(raw * unit, 1.5) : 0);

    const bars = points.map((point, i) => {
      const upH = visible(point.cashIn);
      const downH = visible(point.cashOut);
      return {
        key: point.month,
        x: GUTTER + i * colW + (colW - BAR_W) / 2,
        upY: ZERO_Y - upH,
        upH,
        downH,
      };
    });

    const step = niceStepLakhs(Math.max(maxIn, maxOut) / LAKH);
    const grid: Array<{ y: number; label: string }> = [];
    for (let s = step; s * LAKH <= maxIn * 1.02; s += step) {
      grid.push({ y: ZERO_Y - s * LAKH * unit, label: axisLabel(s) });
    }
    for (let s = step; s * LAKH <= maxOut * 1.02; s += step) {
      grid.push({ y: ZERO_Y + s * LAKH * unit, label: axisLabel(s) });
    }

    const ticks = points
      .map((point, i) => ({ x: GUTTER + i * colW + colW / 2, t: bucketTick(point.month, i), i }))
      .filter((_, i) => i % 3 === 0 || i === points.length - 1);

    return { bars, grid, ticks };
  }, [points]);

  return (
    <BusinessCard
      label="Cash flow"
      isError={isError}
      onRetry={onRetry}
      errorHeight={236}
      link={{ gate: 'finance.view', label: 'Open finance', href: businessLinks.finance() }}
    >
      <div className="flex items-baseline gap-3.5 pb-3">
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-secondary">
            <span
              className="size-2 rounded-sm"
              style={{ background: CHART_COLORS[1] }}
              aria-hidden="true"
            />
            Money in
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-secondary">
            <span
              className="size-2 rounded-sm"
              style={{ background: CHART_COLORS[8] }}
              aria-hidden="true"
            />
            Money out
          </span>
        </div>
        <div className="ml-auto text-[12px] text-foreground-tertiary">
          Net{' '}
          <span
            className="font-medium tabular-nums"
            style={{ color: net < 0 ? color.danger : color['text-primary'] }}
          >
            {money(net, format)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={VIEW_H}
        className="block"
        role="img"
        aria-label={`Cash in and out, ${rangeLabel}. Net ${money(net, format)}.`}
      >
        {chart.grid.map((line) => (
          <g key={`${line.y}-${line.label}`}>
            <line
              x1={GUTTER}
              y1={line.y}
              x2={VIEW_W}
              y2={line.y}
              stroke={color['chart-gridline']}
              strokeWidth={1}
            />
            <text
              x={GUTTER - 7}
              y={line.y + 3}
              textAnchor="end"
              className="font-mono text-[9.5px]"
              fill={color['text-tertiary']}
            >
              {line.label}
            </text>
          </g>
        ))}

        <line
          x1={GUTTER}
          y1={ZERO_Y}
          x2={VIEW_W}
          y2={ZERO_Y}
          stroke={color.hairline}
          strokeWidth={1}
        />

        {chart.bars.map((bar) => (
          <g key={bar.key}>
            <rect
              x={bar.x}
              y={bar.upY}
              width={BAR_W}
              height={bar.upH}
              rx={3}
              fill={CHART_COLORS[1]}
            />
            <rect
              x={bar.x}
              y={ZERO_Y}
              width={BAR_W}
              height={bar.downH}
              rx={3}
              fill={CHART_COLORS[8]}
            />
          </g>
        ))}

        {chart.ticks.map((tick) => (
          <text
            key={tick.i}
            x={tick.x}
            y={222}
            textAnchor="middle"
            className="font-mono text-[9.5px]"
            fill={color['text-tertiary']}
          >
            {tick.t}
          </text>
        ))}
      </svg>

      <p className="pb-0.5 pt-2 text-[11.5px] text-foreground-tertiary">
        Keyed on value date · {rangeLabel}
      </p>
    </BusinessCard>
  );
}
