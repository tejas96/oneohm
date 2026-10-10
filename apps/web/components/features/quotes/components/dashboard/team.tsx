'use client';

import type { QuotesDashboard, QuotesDashboardTeamRow } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  { key: 'drafting', label: 'drafting', color: 'var(--ds-neutral-300)' },
  { key: 'waiting', label: 'waiting', color: 'var(--ds-primary-light)' },
  { key: 'quiet', label: 'quiet', color: 'var(--ds-danger)' },
] as const;

/** Rows shown before "+N more"; the rest scroll inside the card. */
const COLLAPSED_ROWS = 8;

/** "Deepali: 10 drafting, 18 waiting, 6 quiet, 4 won" — the row's numbers in words. */
function teamSummary(t: QuotesDashboardTeamRow): string {
  return `${t.name}: ${t.drafting} drafting, ${t.waiting} waiting, ${t.quiet} quiet, ${t.won} won`;
}

export function Team({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const [expanded, setExpanded] = React.useState(false);
  // More rows below the fold of the open list: drives the bottom fade hint.
  const [moreBelow, setMoreBelow] = React.useState(false);
  const listRef = React.useRef<HTMLUListElement>(null);
  const syncFade = React.useCallback((): void => {
    const el = listRef.current;
    setMoreBelow(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  React.useEffect(() => {
    syncFade();
  }, [expanded, data.team.length, syncFade]);
  const max = Math.max(1, ...data.team.map((t) => t.open));
  const hidden = Math.max(0, data.team.length - COLLAPSED_ROWS);
  const rows = expanded ? data.team : data.team.slice(0, COLLAPSED_ROWS);
  return (
    <section
      className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)}
      style={enterDelay(11)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Team</h2>
        <span className="text-2xs text-foreground-tertiary">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="ml-2 inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-sm"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
          {/* "N won" follows the period picker; say so, like the other period cards. */}
          <span className="ml-2">· won in {data.period.label}</span>
        </span>
      </header>
      {data.team.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No open deals.</p>
      ) : (
        // Expanded: the card keeps its height and the list scrolls inside it.
        <div className="relative">
          <ul
            ref={listRef}
            onScroll={syncFade}
            id="quotes-team-list"
            className={cn(
              'divide-y divide-border',
              expanded && 'max-h-[336px] overflow-y-auto overscroll-contain pr-1',
            )}
          >
            {rows.map((t, i) => (
              <li key={t.personId} className={ENTER} style={enterDelay(i, 40)}>
                <Link
                  href={quoteLinks.personOpen(t.personId, filters)}
                  className="-mx-2 grid grid-cols-[minmax(0,88px)_minmax(0,1fr)_28px_52px] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-alt"
                  title={teamSummary(t)}
                >
                  {/* The link reads as the summary; the visible cells are the same facts. */}
                  <span className="sr-only">{teamSummary(t)}</span>
                  <span aria-hidden="true" className="truncate text-foreground">
                    {t.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-1.5 overflow-hidden rounded-full bg-surface-alt"
                    style={{ width: `${(t.open / max) * 100}%` }}
                  >
                    {SEGMENTS.map((s) =>
                      t[s.key] > 0 ? (
                        <span
                          key={s.key}
                          className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                          style={{
                            width: `${(t[s.key] / Math.max(1, t.open)) * 100}%`,
                            background: s.color,
                          }}
                        />
                      ) : null,
                    )}
                  </span>
                  <span aria-hidden="true" className="text-right tabular-nums text-foreground">
                    {t.open}
                  </span>
                  <span aria-hidden="true" className="text-right text-xs text-foreground-tertiary">
                    {t.won} won
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* macOS hides the scrollbar until you scroll; the fade says "there is more". */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent transition-opacity duration-200 motion-reduce:transition-none',
              expanded && moreBelow ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
      )}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="quotes-team-list"
          className="mt-2 inline-block text-xs font-medium text-primary-dark hover:underline"
        >
          {expanded ? 'Show less' : `+${hidden} more`}
        </button>
      ) : null}
    </section>
  );
}
