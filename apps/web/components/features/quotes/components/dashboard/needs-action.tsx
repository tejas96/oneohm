'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import { DEAL_ATTENTION_LABELS } from '@tejas96/shared/utils';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export function NeedsAction({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const allClear = data.needsAction.every((n) => n.count === 0);
  return (
    <section
      className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)}
      style={enterDelay(10)}
    >
      <header className="pb-2">
        <h2 className="text-sm font-semibold text-foreground">Needs action</h2>
      </header>
      {allClear ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">
          Nothing waiting on anyone.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.needsAction.map((n, i) => (
            <li key={n.key} className={ENTER} style={enterDelay(i, 40)}>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={quoteLinks.attention(n.key, filters)}
                    className="text-sm text-foreground hover:text-primary-dark hover:underline"
                  >
                    {DEAL_ATTENTION_LABELS[n.key]}
                  </Link>
                  {n.owners.length > 0 ? (
                    <p
                      className="truncate text-xs text-foreground-tertiary"
                      title={`${n.owners.map((o) => `${o.name} ${o.count}`).join(' · ')}${
                        n.moreOwners > 0 ? ` · +${n.moreOwners} more` : ''
                      }`}
                    >
                      {n.owners.map((o, j) => (
                        <React.Fragment key={o.personId}>
                          {j > 0 ? ' · ' : null}
                          <Link
                            href={quoteLinks.attention(n.key, filters, o.personId)}
                            className="hover:text-primary-dark hover:underline"
                          >
                            {o.name} {o.count}
                          </Link>
                        </React.Fragment>
                      ))}
                      {n.moreOwners > 0 ? ` · +${n.moreOwners} more` : null}
                    </p>
                  ) : null}
                </div>
                {n.count > 0 ? (
                  <Link
                    href={quoteLinks.attention(n.key, filters)}
                    className="shrink-0 text-sm font-semibold tabular-nums text-error hover:underline"
                  >
                    {n.count}
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs text-foreground-tertiary">None</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
