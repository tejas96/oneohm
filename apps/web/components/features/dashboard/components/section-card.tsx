'use client';

import type { DashboardBucket, DashboardItem, DashboardSection } from '@tejas96/shared/types';
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
  /**
   * The block's row budget from spec 6.3 "Density", spent ACROSS the whole
   * card rather than per bucket — five rows means five rows on screen, however
   * many buckets they came from.
   */
  rowCap: number;
  /**
   * Draw a sub-header above each bucket. Blocks 4 and 5 (follow-ups, service)
   * only: they are the two the design brief groups under sub-labels. The rest
   * are flat lists, where a sub-header would merely restate the section label.
   */
  bucketed?: boolean;
  onRetry?: () => void;
  children: (items: DashboardItem[]) => React.ReactNode;
}

export function SectionCard({
  label,
  tone = 'neutral',
  section,
  aside,
  overflow,
  emptyMessage,
  rowCap,
  bucketed = false,
  onRetry,
  children,
}: SectionCardProps): React.JSX.Element {
  const total = section.status === 'ok' ? section.total : 0;

  // Spend the row budget bucket by bucket, in the order the provider ranked
  // them — most urgent first. Slicing the FLATTENED list, as this did, drew the
  // right number of rows but hid which bucket they came from: the service card
  // rendered five identical "Nobody is assigned to this yet" rows and let four
  // due-soon items fall off with nothing on screen saying so.
  const visible: DashboardBucket[] = [];
  if (section.status === 'ok') {
    let budget = rowCap;
    for (const bucket of section.buckets) {
      if (budget <= 0) break;
      const items = bucket.items.slice(0, budget);
      // A bucket the budget could not reach is dropped rather than drawn as a
      // header with nothing under it.
      if (items.length === 0) continue;
      budget -= items.length;
      visible.push({ ...bucket, items });
    }
  }
  const shown = visible.reduce((count, bucket) => count + bucket.items.length, 0);

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
            'text-section font-semibold uppercase tracking-wide tabular-nums',
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
      ) : shown === 0 ? (
        total > 0 ? (
          /* ALL LIFTED — the section is not empty, it is entirely critical, and
             every one of its rows is already drawn in Needs attention. Saying
             "no payments are due" under a badge reading 38 is a lie the badge
             immediately contradicts. Quiet, like the empty state: this is a
             statement of where the work went, not an alarm. */
          <p className="py-4 text-sm text-foreground-tertiary">
            Everything in this section is shown in Needs attention above.
          </p>
        ) : (
          /* EMPTY — quiet. An empty section is good news, not an alarm. */
          <p className="py-4 text-sm text-foreground-tertiary">{emptyMessage}</p>
        )
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            {visible.map((bucket) => (
              <React.Fragment key={bucket.key}>
                {bucketed ? (
                  // The bucket's OWN count, not the number of rows under it —
                  // `count` is the true total, so "DUE IN 7 DAYS · 9" over two
                  // rows is the honest reading. Same tiny letter-spaced
                  // uppercase as the section label, one step quieter, coloured
                  // by the urgency of what it holds. Buckets are
                  // severity-homogeneous by construction in all five providers,
                  // so the first item's severity IS the bucket's.
                  <h3
                    className={cn(
                      'px-3 pb-1 pt-3 text-section font-semibold uppercase tracking-wider first:pt-0',
                      LABEL_TONE[bucket.items[0]?.severity ?? 'neutral'],
                    )}
                  >
                    {`${bucket.label} · ${bucket.count}`}
                  </h3>
                ) : null}
                {children(bucket.items)}
              </React.Fragment>
            ))}
          </div>
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
