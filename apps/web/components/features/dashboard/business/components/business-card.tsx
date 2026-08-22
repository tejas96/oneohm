'use client';

import { RotateCw } from 'lucide-react';
import * as React from 'react';

import { GatedLink } from './gated-link';

import { ALWAYS_OPEN, type Gate } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface BusinessCardProps {
  /** Small uppercase label, e.g. "Cash flow". */
  label: string;
  /** Quiet text on the right of the header — a range, a grain, a scope note. */
  aside?: React.ReactNode;
  /** Rendered under the header, above the body. Used for the ageing scope line. */
  note?: React.ReactNode;
  /** A "chip" pinned right of the label, e.g. the "As of today" pill. */
  chip?: React.ReactNode;
  isError?: boolean;
  onRetry?: () => void;
  /** Height the retry state occupies, so a failed panel does not collapse the grid. */
  errorHeight?: number;
  /**
   * Bottom-left deep link, e.g. "Open finance".
   *
   * `gate` is the DESTINATION ROUTE's permission, which is not always the one
   * that revealed this panel — `/finance/receivables` needs
   * `finance.receivables.view`, not the `finance.view` that shows the money.
   */
  link?: { label: string; href: string; gate?: Gate };
  /** Bottom-right quiet figure, e.g. unallocated credit. */
  linkAside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * The card shell every Business-mode panel sits in.
 *
 * Failure is contained here rather than in each panel: one section showing a
 * retry while the other six render is the whole point of using a query per
 * panel instead of one combined call.
 *
 * `rounded-3xl` is 24px, which is the design system's `--r-card-expressive`.
 * The shipped My Work cards use `rounded-xl` (12px) — a pre-existing
 * divergence from the design system, not something introduced here.
 */
export function BusinessCard({
  label,
  aside,
  note,
  chip,
  isError = false,
  onRetry,
  errorHeight = 180,
  link,
  linkAside,
  children,
  className,
}: BusinessCardProps): React.JSX.Element {
  return (
    <section className={cn('rounded-3xl bg-surface px-[22px] pb-4 pt-5 shadow-e2', className)}>
      <div className="flex items-baseline gap-2.5 pb-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
          {label}
        </h2>
        {chip ? <div className="ml-auto">{chip}</div> : null}
        {aside && !chip ? (
          <div className="ml-auto text-[11.5px] text-foreground-tertiary">{aside}</div>
        ) : null}
      </div>

      {note ? <p className="pb-4 text-[11.5px] text-foreground-tertiary">{note}</p> : null}

      {isError ? (
        <div
          className="flex flex-col items-start justify-center gap-3.5"
          style={{ height: errorHeight }}
        >
          <p className="text-[13.5px] text-foreground-secondary">
            {label} didn&apos;t load. Nothing else on this page is affected.
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-accent-subtle px-3.5 text-[12.5px] font-medium text-primary-dark"
            >
              <RotateCw className="size-3" />
              Retry
            </button>
          ) : null}
        </div>
      ) : (
        children
      )}

      {link || linkAside ? (
        <div className="flex items-baseline gap-3.5 pb-0.5 pt-3">
          {link ? (
            <GatedLink
              href={link.href}
              gate={link.gate ?? ALWAYS_OPEN}
              subject={link.label}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary-dark"
            >
              {link.label}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m9 6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </GatedLink>
          ) : null}
          {linkAside ? (
            <div className="ml-auto text-[11.5px] tabular-nums text-foreground-tertiary">
              {linkAside}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
