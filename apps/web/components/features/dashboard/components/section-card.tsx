'use client';

import type { DashboardItem, DashboardSection } from '@tejas96/shared/types';
import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

type Tone = 'critical' | 'warning' | 'info' | 'neutral';

// `text-danger` does not resolve — this token bridge has no top-level `danger`
// colour, only `error` (`--ds-danger` under a different name). `text-error`
// is the exact same value.
const LABEL_TONE: Record<Tone, string> = {
  critical: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-foreground-secondary',
};

interface SectionCardProps {
  label: string;
  tone?: Tone;
  section: DashboardSection;
  /** e.g. "2 overdue shown above". */
  aside?: string;
  overflow?: { label: string; href?: string; onClick?: () => void };
  emptyMessage: string;
  skeletonRows: number;
  onRetry?: () => void;
  children: (items: DashboardItem[]) => React.ReactNode;
}

// `skeletonRows` is part of the public contract (Task 12 passes the same
// count it gives `SectionSkeleton`, so a caller doesn't have to know two
// different numbers), but `SectionCard` itself only ever renders once the
// section has resolved to 'ok' or 'error' — the loading state is the sibling
// `SectionSkeleton` below. Left undestructured (not `skeletonRows,` in the
// pattern) so it stays required on `SectionCardProps` without tripping
// `noUnusedLocals` on a binding this component never reads.
export function SectionCard({
  label,
  tone = 'neutral',
  section,
  aside,
  overflow,
  emptyMessage,
  onRetry,
  children,
}: SectionCardProps): React.JSX.Element {
  const total = section.status === 'ok' ? section.total : 0;
  const items =
    section.status === 'ok' ? section.buckets.flatMap((bucket) => bucket.items) : [];

  return (
    // `rounded-r-sm` collides with Tailwind's built-in `rounded-r-*` (right-corner)
    // utility: the generated stylesheet carries BOTH a flat `border-radius:
    // var(--radius-r-sm)` rule and a directional `border-{top,bottom}-right-radius:
    // 2px` rule (from `borderRadius.sm` in tailwind.config.ts), and the latter wins
    // the cascade for the right corners — a lopsided card, 12px left / 2px right.
    // `rounded-xl` is the nearest resolving, non-colliding class: `borderRadius.xl`
    // is 12px, the exact value `--radius-r-sm` authors, and it is already the
    // established card radius (`components/ui/card.tsx`'s `CARD_BASE`).
    <section className="rounded-xl bg-surface p-5 shadow-e2">
      <header className="flex items-baseline gap-2.5 pb-2">
        <h2
          className={cn(
            'text-section font-semibold uppercase tracking-wide',
            LABEL_TONE[tone],
          )}
        >
          {label}
          {section.status === 'ok' ? ` · ${total}` : ''}
        </h2>
        {aside ? (
          <span className="ml-auto text-2xs text-foreground-tertiary">{aside}</span>
        ) : null}
      </header>

      {/* BROKEN — this card only. Every other card on the page still draws. */}
      {section.status === 'error' ? (
        <div className="flex items-center gap-3 py-4">
          <p className="text-sm text-foreground-secondary">
            {label} could not be loaded. Nothing else on this page is affected.
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-accent-subtle px-3 text-xs font-medium text-primary-dark"
            >
              <RotateCw className="size-3" />
              Retry
            </button>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        /* EMPTY — quiet. An empty section is good news, not an alarm. */
        <p className="py-4 text-sm text-foreground-tertiary">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">{children(items)}</div>
          {overflow ? (
            <div className="pt-2">
              {overflow.href ? (
                <Link href={overflow.href} className="text-xs font-medium text-secondary">
                  {overflow.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={overflow.onClick}
                  className="text-xs font-medium text-secondary"
                >
                  {overflow.label}
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * LOADING — skeleton rows that match the real row grid exactly, so nothing on
 * the page moves when the data lands.
 */
export function SectionSkeleton({ rows }: { rows: number }): React.JSX.Element {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-e2">
      <Skeleton className="h-3 w-32" />
      <div className="mt-4 flex flex-col gap-0.5">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-3"
          >
            <div>
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-2 h-2.5 w-24" />
            </div>
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-7 w-24 rounded-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}
