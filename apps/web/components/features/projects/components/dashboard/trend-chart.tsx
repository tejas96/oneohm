'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatKw, monthLabel, plural } from './format';
import { dashboardLinks } from './links';
import { ENTER, enterDelay, usePrefersReducedMotion } from './motion';

import { cn } from '@/lib/utils';

type Unit = 'projects' | 'kw';

const CHART_MARGIN = { top: 8, right: 0, left: -16, bottom: 0 };
const Y_AXIS_WIDTH = 44;

const COLORS = {
  onboarded: 'var(--ds-neutral-300)',
  meter: 'var(--ds-primary)',
  grid: 'var(--ds-hairline)',
  axis: 'var(--ds-neutral-500)',
};

export function TrendChart({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [unit, setUnit] = React.useState<Unit>('projects');

  const rows = data.trend.map((t) => ({
    month: t.month,
    label: monthLabel(t.month),
    onboarded: unit === 'projects' ? t.onboarded : Math.round(t.onboardedKw * 10) / 10,
    meter: unit === 'projects' ? t.meterInstalled : Math.round(t.meterKw * 10) / 10,
  }));

  const go = (kind: 'onboarded' | 'meterInstalled', month: string): void =>
    router.push(dashboardLinks.month(kind, month, financing));

  // A bar opens its own series. Recharts draws no rectangle for 0, so a month
  // with nothing to click still takes a click anywhere in its column: it opens
  // the onboarded list, or the meter list when only meters were installed.
  const openBar =
    (kind: 'onboarded' | 'meterInstalled') =>
    (entry: unknown, _index: number, event?: React.MouseEvent): void => {
      event?.stopPropagation();
      const month = (entry as { payload?: { month?: string } }).payload?.month;
      if (month) go(kind, month);
    };
  // The month under the pointer comes from the click's own position, not the
  // chart's hover state: a tap on a phone arrives before that state updates.
  const openColumn = (_state: unknown, event: React.MouseEvent): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const plotLeft = CHART_MARGIN.left + Y_AXIS_WIDTH;
    const plotWidth = box.width - plotLeft - CHART_MARGIN.right;
    const x = event.clientX - box.left - plotLeft;
    if (rows.length === 0 || x < 0 || x >= plotWidth) return;
    const row = rows[Math.floor((x / plotWidth) * rows.length)];
    if (!row) return;
    go(row.onboarded === 0 && row.meter > 0 ? 'meterInstalled' : 'onboarded', row.month);
  };
  const fmt = (v: number): string => (unit === 'kw' ? formatKw(v) : String(v));

  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(8)}>
      <header className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Last 12 months</h2>
          <p className="text-2xs text-foreground-tertiary">
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-sm align-middle"
              style={{ background: COLORS.onboarded }}
            />
            onboarded
            <span
              aria-hidden="true"
              className="ml-3 mr-1 inline-block size-2 rounded-sm align-middle"
              style={{ background: COLORS.meter }}
            />
            meter installed · select a bar to see its projects
          </p>
        </div>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={unit}
          onChange={(_, next: Unit | null) => next && setUnit(next)}
          aria-label="Chart unit"
        >
          <ToggleButton value="projects">Projects</ToggleButton>
          <ToggleButton value="kw">kW</ToggleButton>
        </ToggleButtonGroup>
      </header>
      <div className="h-[220px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 320, height: 220 }}
        >
          <BarChart
            data={rows}
            barGap={2}
            onClick={openColumn}
            style={{ cursor: 'pointer' }}
            margin={CHART_MARGIN}
          >
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: COLORS.axis }}
            />
            <YAxis
              allowDecimals={unit === 'kw'}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
              tick={{ fontSize: 11, fill: COLORS.axis }}
            />
            <Tooltip
              cursor={{ fill: 'var(--ds-canvas-sunken)' }}
              formatter={(value, name) => [fmt(Number(value ?? 0)), String(name ?? '')]}
            />
            <Bar
              dataKey="onboarded"
              name="Onboarded"
              fill={COLORS.onboarded}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={700}
              cursor="pointer"
              onClick={openBar('onboarded')}
            />
            <Bar
              dataKey="meter"
              name="Meter installed"
              fill={COLORS.meter}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={700}
              animationBegin={150}
              cursor="pointer"
              onClick={openBar('meterInstalled')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Keyboard and screen-reader route to the same lists the bars open. Hidden until a link gets focus. */}
      <ul className="sr-only focus-within:not-sr-only focus-within:mt-3 focus-within:grid focus-within:grid-cols-2 focus-within:gap-x-6 focus-within:gap-y-1 focus-within:text-xs focus-within:text-foreground-secondary sm:focus-within:grid-cols-4">
        {data.trend.map((t) => (
          <li key={t.month}>
            {monthLabel(t.month)}:{' '}
            <Link
              className="hover:text-primary-dark hover:underline"
              href={dashboardLinks.month('onboarded', t.month, financing)}
            >
              {t.onboarded} onboarded
            </Link>
            ,{' '}
            <Link
              className="hover:text-primary-dark hover:underline"
              href={dashboardLinks.month('meterInstalled', t.month, financing)}
            >
              {plural(t.meterInstalled, 'meter installed', 'meters installed')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
