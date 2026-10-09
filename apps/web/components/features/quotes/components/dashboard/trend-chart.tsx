'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { quoteLinks } from './links';
import { formatRupees } from './strip';

import { ENTER, enterDelay, monthLabel, usePrefersReducedMotion } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

type Unit = 'deals' | 'value';

const CHART_MARGIN = { top: 8, right: 0, left: -16, bottom: 0 };
// Rupee ticks ("₹285.00L") are wider than the y-axis column, so give them their own room.
const CHART_MARGIN_VALUE = { ...CHART_MARGIN, left: 24 };
const Y_AXIS_WIDTH = 52;
const COLORS = {
  new: 'var(--ds-neutral-300)',
  won: 'var(--ds-primary)',
  grid: 'var(--ds-hairline)',
  axis: 'var(--ds-neutral-500)',
};

export function QuotesTrendChart({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [unit, setUnit] = React.useState<Unit>('deals');

  const rows = data.trend.map((t) => ({
    month: t.month,
    label: monthLabel(t.month),
    new: unit === 'deals' ? t.newCount : t.newValueRupees,
    won: unit === 'deals' ? t.wonCount : t.wonValueRupees,
  }));

  const margin = unit === 'value' ? CHART_MARGIN_VALUE : CHART_MARGIN;
  const go = (kind: 'new' | 'won', month: string): void => router.push(quoteLinks.month(kind, month, filters));
  const openBar =
    (kind: 'new' | 'won') =>
    (entry: unknown, _index: number, event?: React.MouseEvent): void => {
      event?.stopPropagation();
      const month = (entry as { payload?: { month?: string } }).payload?.month;
      if (month) go(kind, month);
    };
  // A click anywhere in a month's column opens it (Recharts draws no bar for 0).
  const openColumn = (_state: unknown, event: React.MouseEvent): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const plotLeft = margin.left + Y_AXIS_WIDTH;
    const plotWidth = box.width - plotLeft - margin.right;
    const x = event.clientX - box.left - plotLeft;
    if (rows.length === 0 || x < 0 || x >= plotWidth) return;
    const row = rows[Math.floor((x / plotWidth) * rows.length)];
    if (!row) return;
    go(row.new === 0 && row.won > 0 ? 'won' : 'new', row.month);
  };
  const fmt = (v: number): string => (unit === 'value' ? formatRupees(v) : String(v));

  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(14)}>
      <header className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Last 12 months</h2>
          <p className="text-2xs text-foreground-tertiary">
            <span aria-hidden="true" className="mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: COLORS.new }} />
            new deals
            <span aria-hidden="true" className="ml-3 mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: COLORS.won }} />
            won · select a bar to see its deals
          </p>
        </div>
        <ToggleButtonGroup exclusive size="small" value={unit} onChange={(_, next: Unit | null) => next && setUnit(next)} aria-label="Chart unit">
          <ToggleButton value="deals">Deals</ToggleButton>
          <ToggleButton value="value">₹</ToggleButton>
        </ToggleButtonGroup>
      </header>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 220 }}>
          <BarChart data={rows} barGap={2} onClick={openColumn} style={{ cursor: 'pointer' }} margin={margin}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: COLORS.axis }} />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
              tick={{ fontSize: 11, fill: COLORS.axis }}
              tickFormatter={(v: number) => (unit === 'value' ? formatRupees(v) : String(v))}
            />
            <Tooltip cursor={{ fill: 'var(--ds-canvas-sunken)' }} formatter={(value, name) => [fmt(Number(value ?? 0)), String(name ?? '')]} />
            <Bar dataKey="new" name="New deals" fill={COLORS.new} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={700} cursor="pointer" onClick={openBar('new')} />
            <Bar dataKey="won" name="Won" fill={COLORS.won} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={700} animationBegin={150} cursor="pointer" onClick={openBar('won')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only focus-within:not-sr-only focus-within:mt-3 focus-within:grid focus-within:grid-cols-2 focus-within:gap-x-6 focus-within:gap-y-1 focus-within:text-xs focus-within:text-foreground-secondary sm:focus-within:grid-cols-4">
        {data.trend.map((t) => (
          <li key={t.month}>
            {monthLabel(t.month)}:{' '}
            <Link className="hover:text-primary-dark hover:underline" href={quoteLinks.month('new', t.month, filters)}>
              {t.newCount} new
            </Link>
            ,{' '}
            <Link className="hover:text-primary-dark hover:underline" href={quoteLinks.month('won', t.month, filters)}>
              {t.wonCount} won
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
