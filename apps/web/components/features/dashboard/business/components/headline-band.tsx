'use client';

import * as React from 'react';

import { money, rupeesExact, type MoneyFormat } from '../lib/format';

import { cn } from '@/lib/utils';

export interface HeadlineTile {
  label: string;
  value: string;
  /** Quiet line under the value. Empty string renders nothing, not a gap. */
  sub?: string;
  /** True when `sub` should read as a problem, e.g. an overdue count. */
  subIsBad?: boolean;
  href: string;
}

interface HeadlineBandProps {
  /** The one number the page leads with. */
  hero: { label: string; value: string; exact?: string; sub: string; isBad?: boolean; href: string };
  tiles: HeadlineTile[];
  rangeLabel: string;
  compact: boolean;
}

function TileLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="flex items-center gap-[5px] text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
      {children}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m9 6 6 6-6 6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground-muted"
        />
      </svg>
    </span>
  );
}

/**
 * "The whole business" — the band the page opens with.
 *
 * The hero is deliberately much larger than the four tiles beside it. Only one
 * number answers "is this month going well", and the layout should not pretend
 * the other four are equal to it.
 *
 * The exact rupee figure sits under the hero in mono so the headline can be
 * read across the room AND reconciled against /finance. It is dropped when the
 * whole screen is already showing full figures, where it would just repeat.
 */
export function HeadlineBand({
  hero,
  tiles,
  rangeLabel,
  compact,
}: HeadlineBandProps): React.JSX.Element {
  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-surface px-[26px] py-6 shadow-e2">
      {/* Ambient brand glow, matching the My Work greeting card. Decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-[250px] size-[420px] rounded-full opacity-95"
        style={{ background: 'var(--ds-glow-brand)' }}
      />

      <div className="relative flex items-baseline gap-2.5 pb-[18px]">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
          The whole business
        </h2>
        <p className="text-[12px] text-foreground-tertiary">Organisation-wide · {rangeLabel}</p>
      </div>

      <div className="relative grid grid-cols-[318px_repeat(4,1fr)] items-start gap-x-6">
        <a
          href={hero.href}
          className="-mx-2.5 -my-2 block rounded-2xl px-2.5 py-2 hover:bg-background-tertiary"
        >
          <TileLabel>{hero.label}</TileLabel>
          <div
            className={cn(
              'mt-2.5 font-bold leading-none tracking-[-0.035em] tabular-nums',
              compact ? 'text-[48px]' : 'text-[34px]',
              hero.isBad ? 'text-error' : 'text-foreground',
            )}
          >
            {hero.value}
          </div>
          {hero.exact ? (
            <div className="mt-[9px] font-mono text-[12px] tabular-nums text-foreground-tertiary">
              {hero.exact}
            </div>
          ) : null}
          <div className="mt-[3px] text-[12.5px] text-foreground-secondary">{hero.sub}</div>
        </a>

        {tiles.map((tile) => (
          <a
            key={tile.label}
            href={tile.href}
            className="-mx-2.5 -my-2 block rounded-2xl px-2.5 py-2 hover:bg-background-tertiary"
          >
            <TileLabel>{tile.label}</TileLabel>
            <div
              className={cn(
                'mt-2.5 font-bold leading-[1.05] tracking-[-0.03em] tabular-nums',
                compact ? 'text-[26px]' : 'text-[19px]',
              )}
            >
              {tile.value}
            </div>
            {tile.sub ? (
              <div
                className={cn(
                  'mt-2 text-[12.5px]',
                  tile.subIsBad ? 'text-error' : 'text-foreground-tertiary',
                )}
              >
                {tile.sub}
              </div>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

/** Re-exported so callers format hero figures the same way this band does. */
export { money, rupeesExact };
export type { MoneyFormat };
