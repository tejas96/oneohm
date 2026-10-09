'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export function Sources({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const { period } = data;
  const max = Math.max(1, ...data.sources.map((s) => s.count));
  return (
    <section
      className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)}
      style={enterDelay(13)}
    >
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Where deals come from</h2>
        <span className="text-2xs text-foreground-tertiary">{period.label}</span>
      </header>
      {data.sources.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">
          No new deals in this period.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.sources.map((s, i) => (
            <li key={s.key} className={ENTER} style={enterDelay(i, 40)}>
              <Link
                href={quoteLinks.source(s.key, data.topSourceKeys, period.from, period.to, filters)}
                className="-mx-2 grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_28px_60px] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-alt"
              >
                <span className="truncate text-foreground" title={s.label}>
                  {s.label}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <span
                    className="block h-full rounded-full bg-primary-light transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground">{s.count}</span>
                <span className="text-right text-xs text-foreground-tertiary">
                  {s.winPercent == null ? '—' : `${s.winPercent}% win`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
