'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { dashboardLinks } from './links';

import { GatedLink } from '@/components/features/dashboard/business/components/gated-link';
import {
  AnimatedNumber,
  ENTER,
  enterDelay,
  formatKw,
  formatPaiseCompact,
} from '@/components/features/dashboard/kit';
import { cn } from '@/lib/utils';

const BIG =
  'block text-2xl font-semibold tabular-nums text-foreground hover:text-primary-dark focus-visible:underline';
const SMALL = 'text-xs text-foreground-tertiary hover:text-primary-dark hover:underline';

function Stat({
  label,
  tag,
  index,
  children,
}: {
  label: string;
  tag?: string;
  index: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl bg-surface p-4 shadow-e2 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none',
        ENTER,
      )}
      style={enterDelay(index)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="truncate text-xs font-medium text-foreground-secondary">{label}</h2>
        {tag ? (
          <span className="w-full text-2xs text-foreground-tertiary sm:w-auto sm:shrink-0">
            {tag}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function kwLine(kw: number, unknown: number): string {
  return unknown > 0 ? `${formatKw(kw)} · ${unknown} without kW` : formatKw(kw);
}

export function OwnerStrip({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const { strip, period } = data;
  const delta = strip.meterInstalled.count - strip.meterInstalled.previousCount;
  const money = strip.money;

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3',
        money ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
      )}
    >
      <Stat label="Onboarded" tag={period.label} index={0}>
        <Link href={dashboardLinks.onboarded(period.from, period.to, financing)} className={BIG}>
          <AnimatedNumber value={strip.onboarded.count} />
        </Link>
        <span className="text-xs text-foreground-tertiary">
          {kwLine(strip.onboarded.kw, strip.onboarded.kwUnknown)}
        </span>
        {financing === 'all' ? (
          <span className="text-xs text-foreground-tertiary">
            <Link className={SMALL} href={dashboardLinks.onboarded(period.from, period.to, 'cash')}>
              {strip.onboarded.cash} cash
            </Link>
            {' · '}
            <Link className={SMALL} href={dashboardLinks.onboarded(period.from, period.to, 'loan')}>
              {strip.onboarded.loan} loan
            </Link>
          </span>
        ) : null}
      </Stat>

      <Stat label="Live now" index={1}>
        <Link href={dashboardLinks.live(financing)} className={BIG}>
          <AnimatedNumber value={strip.live.count} />
        </Link>
        <Link href={dashboardLinks.notStarted(financing)} className={SMALL}>
          {strip.live.notStarted} not started
        </Link>
        <Link href={dashboardLinks.inProgress(financing)} className={SMALL}>
          {strip.live.inProgress} in progress
        </Link>
        <span className="text-xs text-foreground-tertiary">
          {kwLine(strip.live.kw, strip.live.kwUnknown)} in work
        </span>
      </Stat>

      <Stat label="Meter installed" tag={period.label} index={2}>
        <Link
          href={dashboardLinks.meterInstalled(period.from, period.to, financing)}
          className={BIG}
        >
          <AnimatedNumber value={strip.meterInstalled.count} />
        </Link>
        <span className="text-xs text-foreground-tertiary">
          <span
            className={cn('font-medium', delta > 0 && 'text-success', delta < 0 && 'text-error')}
          >
            {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : 'Same'}
          </span>{' '}
          vs {period.previousLabel}
        </span>
        <span className="text-xs text-foreground-tertiary">
          {kwLine(strip.meterInstalled.kw, strip.meterInstalled.kwUnknown)}
        </span>
      </Stat>

      <Stat label="Running late" index={3}>
        <Link
          href={dashboardLinks.attention('late_steps', financing)}
          className={cn(BIG, strip.late.count > 0 && 'text-error')}
        >
          <AnimatedNumber value={strip.late.count} />
        </Link>
        <span className="text-xs text-foreground-tertiary">
          {strip.late.percentOfLive}% of live projects
        </span>
      </Stat>

      {money ? (
        <Stat label="To collect" index={4}>
          <GatedLink
            href={dashboardLinks.receivables(financing)}
            gate="finance.receivables.view"
            subject="Receivables"
            className={BIG}
          >
            <AnimatedNumber value={money.toCollectPaise} format={formatPaiseCompact} />
          </GatedLink>
          <GatedLink
            href={dashboardLinks.recovery(financing)}
            gate="finance.receivables.view"
            subject="Recovery"
            className={SMALL}
          >
            {formatPaiseCompact(money.meterInStillOwedPaise)} with meter in
          </GatedLink>
        </Stat>
      ) : null}
    </div>
  );
}
