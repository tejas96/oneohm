'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { GatedLink } from './gated-link';
import { formatDay, money, type MoneyFormat } from '../lib/format';
import { businessLinks } from '../lib/links';

import { CHART_COLORS } from '@/lib/charts/palette';
import type { CustomerAging, OutstandingTerm } from '@/lib/hooks/resources/finance-org';
import { color } from '@/lib/theme/tokens';

/**
 * Cool → hot as debt ages. The two middle steps are mixed with the card's own
 * surface so the ramp climbs into `danger` rather than jumping to it.
 */
const RAMP: readonly string[] = [
  CHART_COLORS[8],
  CHART_COLORS[3],
  `color-mix(in srgb, ${color.danger} 40%, ${color.surface})`,
  `color-mix(in srgb, ${color.danger} 70%, ${color.surface})`,
  color.danger,
];

const BUCKET_LABELS = ['Not yet due', '0–30 days', '31–60 days', '61–90 days', '90+ days'] as const;

interface MoneyOwedCardProps {
  aging: CustomerAging[];
  /** Already ordered by days overdue, descending — the endpoint's only ordering. */
  oldest: OutstandingTerm[];
  /**
   * How many milestones are past due. `FinanceKpis.overdueCountNow`.
   *
   * There is deliberately no matching amount prop: the KPI set has no
   * overdue-AMOUNT field, and passing `outstandingNow` in its place labels the
   * whole receivable as overdue. The figure is derived below from the buckets
   * instead — everything that is not "not yet due" is, by definition, overdue.
   */
  overdueCount: number;
  /**
   * The org-wide totals, from `/finance/kpis`.
   *
   * NOT summed from `aging`. That endpoint inner joins projects, properties and
   * customers on `deleted_at IS NULL` and caps at 1000 rows, so its sum silently
   * omits money owed on a soft-deleted project or by a soft-deleted customer,
   * and truncates past 1000 customers. Measured 2026-08-22 the two agree
   * exactly — 422 milestones, ₹1,87,48,816 — but only one of them cannot drift,
   * and it is the one the "Outstanding now" tile above already shows.
   */
  totalOutstanding: number;
  overdueAmount: number;
  unallocatedCredit: number;
  format: MoneyFormat;
  today: Date;
  isError: boolean;
  onRetry: () => void;
}

/**
 * What is owed to us, and how long it has been owed.
 *
 * This panel does NOT follow the page's date range, and says so twice — a chip
 * and a sentence. Ageing is computed against today by definition; the endpoint
 * takes no date at all. Letting a global range appear to apply here would
 * misrepresent every figure in it.
 *
 * Oldest debts are payment TERMS, not customers, because that is the only place
 * a per-row age exists. One customer with three old milestones is three rows,
 * which is the honest consequence.
 */
export function MoneyOwedCard({
  aging,
  oldest,
  overdueCount,
  totalOutstanding,
  overdueAmount,
  unallocatedCredit,
  format,
  today,
  isError,
  onRetry,
}: MoneyOwedCardProps): React.JSX.Element {
  const totals = React.useMemo(() => {
    // A tuple, not number[]: `noUncheckedIndexedAccess` types every element of
    // an array as possibly undefined, and `sums[0] += …` then does not compile.
    const sums: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (const row of aging) {
      sums[0] += row.current;
      sums[1] += row.bucket0to30;
      sums[2] += row.bucket31to60;
      sums[3] += row.bucket61to90;
      sums[4] += row.bucket90plus;
    }
    // Only the shape of the ageing, not the totals — those come from the KPI.
    const bucketSum = sums.reduce((a, b) => a + b, 0);
    return { sums, bucketSum };
  }, [aging]);

  const denominator = totals.bucketSum || 1;
  const customersPast90 = aging.filter((row) => row.bucket90plus > 0).length;

  return (
    <BusinessCard
      label="Money owed, by age"
      isError={isError}
      onRetry={onRetry}
      errorHeight={300}
      chip={
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-pill bg-background-tertiary px-2.5 text-[11px] font-medium text-foreground-secondary">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground-muted"
            />
          </svg>
          As of today · {formatDay(today)}
        </span>
      }
      note="Ageing is counted against today. The date range above does not apply to this panel."
      link={{
        label: 'Open receivables',
        href: businessLinks.receivables(),
        gate: 'finance.receivables.view',
      }}
      linkAside={
        unallocatedCredit > 0 ? `${money(unallocatedCredit, format)} unallocated credit` : undefined
      }
    >
      <div className="flex items-baseline gap-3.5 pb-3.5">
        <div className="text-[32px] font-bold tracking-[-0.03em] tabular-nums">
          {money(totalOutstanding, format)}
        </div>
        <div className="text-[13px] text-foreground-secondary">owed to us</div>
        <div className="ml-auto text-[13px] tabular-nums text-error">
          {money(overdueAmount, format)} overdue · {overdueCount} milestone
          {overdueCount === 1 ? '' : 's'}
        </div>
      </div>

      <div className="flex h-4 overflow-hidden rounded-pill bg-background-tertiary">
        {totals.sums.map((amount, i) => (
          <div
            key={BUCKET_LABELS[i]}
            className="h-4"
            style={{ width: `${((amount / denominator) * 100).toFixed(2)}%`, background: RAMP[i] }}
          />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-x-4 pb-[18px] pt-4">
        {totals.sums.map((amount, i) => (
          <div key={BUCKET_LABELS[i]}>
            <div className="flex items-center gap-1.5 text-[11.5px] text-foreground-secondary">
              <span
                className="size-2 rounded-sm"
                style={{ background: RAMP[i] }}
                aria-hidden="true"
              />
              {BUCKET_LABELS[i]}
            </div>
            <div className="mt-1.5 text-[17px] font-medium tracking-[-0.02em] tabular-nums">
              {money(amount, format)}
            </div>
            <div className="mt-[3px] text-[11px] tabular-nums text-foreground-tertiary">
              {Math.round((amount / denominator) * 100)}% of total
            </div>
          </div>
        ))}
      </div>

      <h3 className="pb-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-foreground-tertiary">
        Oldest debts
      </h3>

      {oldest.length === 0 ? (
        <p className="pb-1 pt-1.5 text-[13px] text-foreground-tertiary">
          Nothing has aged past 90 days.
        </p>
      ) : (
        <>
          {oldest.map((term) => (
            <GatedLink
              key={term.id}
              href={businessLinks.project(term.projectId)}
              gate="projects.view"
              subject={term.projectName}
              className="-mx-2.5 flex min-h-[44px] items-center gap-3.5 rounded-[10px] px-2.5 hover:bg-background-tertiary"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{term.customerName}</span>
                <span className="mt-px block truncate text-[11.5px] text-foreground-tertiary">
                  {term.projectName}
                </span>
              </span>
              <span className="w-[132px] text-right text-[12.5px] tabular-nums text-error">
                {term.daysOverdue ?? 0} days overdue
              </span>
              <span className="w-[110px] text-right font-mono text-[13px] tabular-nums">
                {money(term.outstandingAmount, format)}
              </span>
            </GatedLink>
          ))}
          {customersPast90 > 0 ? (
            <p className="pt-1.5 text-[11.5px] text-foreground-tertiary">
              {customersPast90} customer{customersPast90 === 1 ? '' : 's'} with debt past 90 days
            </p>
          ) : null}
        </>
      )}
    </BusinessCard>
  );
}
