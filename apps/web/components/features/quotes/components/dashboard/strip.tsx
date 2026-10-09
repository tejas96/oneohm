'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import {
  AnimatedNumber,
  ENTER,
  enterDelay,
  formatKw,
  formatPaiseCompact,
} from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export const formatRupees = (rupees: number): string => formatPaiseCompact(Math.round(rupees * 100));

const BIG =
  'block text-2xl font-semibold tabular-nums text-foreground hover:text-primary-dark focus-visible:underline';
const SMALL = 'text-xs text-foreground-tertiary hover:text-primary-dark hover:underline';
const LINE = 'text-xs text-foreground-tertiary';

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
        {tag ? <span className="text-2xs text-foreground-tertiary">{tag}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function QuotesStrip({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const { strip, period } = data;
  const delta = strip.wonValue.valueRupees - strip.wonValue.previousValueRupees;
  const rate = strip.winRate;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat label="New deals" tag={period.label} index={0}>
        <Link href={quoteLinks.newDeals(period.from, period.to, filters)} className={BIG}>
          <AnimatedNumber value={strip.newDeals.count} />
        </Link>
        <span className={LINE}>{formatKw(strip.newDeals.kw)}</span>
        {filters.financing === 'all' ? (
          <span className={LINE}>
            <Link className={SMALL} href={quoteLinks.newDeals(period.from, period.to, filters, 'cash')}>
              {strip.newDeals.cash} cash
            </Link>
            {' · '}
            <Link className={SMALL} href={quoteLinks.newDeals(period.from, period.to, filters, 'loan')}>
              {strip.newDeals.loan} loan
            </Link>
          </span>
        ) : null}
      </Stat>

      <Stat label="Won value" tag={period.label} index={1}>
        <Link href={quoteLinks.won(period.from, period.to, filters)} className={BIG}>
          <AnimatedNumber value={strip.wonValue.valueRupees} format={formatRupees} />
        </Link>
        <span className={LINE}>{formatKw(strip.wonValue.kw)}</span>
        <span className={LINE}>
          <span className={cn('font-medium', delta > 0 && 'text-success', delta < 0 && 'text-error')}>
            {delta > 0 ? `+${formatRupees(delta)}` : delta < 0 ? `−${formatRupees(-delta)}` : 'Same'}
          </span>{' '}
          vs {period.previousLabel}
        </span>
      </Stat>

      <Stat label="Win rate" tag={period.label} index={2}>
        <Link href={quoteLinks.wonOfNew(period.from, period.to, filters)} className={BIG}>
          {rate.percent == null ? '—' : <AnimatedNumber value={rate.percent} format={(n) => `${Math.round(n)}%`} />}
        </Link>
        <span className={LINE}>
          {rate.wonOfNew} won of {rate.newCount} new
        </span>
        {rate.medianDaysToWin != null ? (
          <span className={LINE}>Median {rate.medianDaysToWin} days to win</span>
        ) : null}
      </Stat>

      <Stat label="Open pipeline" index={3}>
        <Link href={quoteLinks.stage('pipeline', filters)} className={BIG}>
          <AnimatedNumber value={strip.pipeline.valueRupees} format={formatRupees} />
        </Link>
        <span className={LINE}>{strip.pipeline.count} deals waiting or quiet</span>
        <span className={LINE}>{formatKw(strip.pipeline.kw)}</span>
      </Stat>
    </div>
  );
}
