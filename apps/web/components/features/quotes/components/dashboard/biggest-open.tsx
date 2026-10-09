'use client';

import type { QuotesDashboard, QuotesDashboardBigDeal } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';
import { formatRupees } from './strip';

import { ENTER, enterDelay, formatKw } from '@/components/features/dashboard/kit';
import { cn } from '@/lib/utils';

function dealTiming(d: QuotesDashboardBigDeal): string {
  if (d.stage === 'quiet') return `quiet ${d.days} d`;
  return d.days === 0 ? 'ends today' : `ends in ${d.days} d`;
}

export function BiggestOpen({ data }: { data: QuotesDashboard }): React.JSX.Element {
  return (
    <section
      className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)}
      style={enterDelay(12)}
    >
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Biggest open deals</h2>
        {/* Plain text: the Open pipeline card already links to these deals. */}
        <span className="text-2xs text-foreground-tertiary">waiting or quiet</span>
      </header>
      {data.biggestOpen.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No open deals.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.biggestOpen.map((d, i) => (
            <li key={d.quoteId} className={ENTER} style={enterDelay(i, 40)}>
              <Link
                href={quoteLinks.quote(d.quoteId)}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-surface-alt"
              >
                <span className="min-w-0">
                  <span
                    className="block truncate text-sm text-foreground"
                    title={d.customerName ?? undefined}
                  >
                    {d.customerName ?? 'Unnamed customer'}
                  </span>
                  <span
                    className="block truncate text-xs text-foreground-tertiary"
                    title={`${d.kw != null ? `${formatKw(d.kw)} · ` : ''}${d.personName} · ${dealTiming(d)}`}
                  >
                    {d.kw != null ? `${formatKw(d.kw)} · ` : ''}
                    {d.personName} ·{' '}
                    {d.stage === 'quiet' ? (
                      <span className="text-error">{dealTiming(d)}</span>
                    ) : (
                      dealTiming(d)
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatRupees(d.valueRupees)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
