'use client';

import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { customerLinks, OPEN_QUOTES_FILTERS } from './links';
import { useCustomerOverviewStats } from '../../hooks/use-customers';

import { AnimatedNumber } from '@/components/features/dashboard/kit';
import { useFollowupSummary } from '@/components/features/followups';
import { useQuotesDashboard } from '@/lib/hooks/resources';
import { cn, formatCurrency, formatCurrencyCompact, formatNumber } from '@/lib/utils';

const FIGURE = 'font-semibold tabular-nums text-foreground';
const LINKED = 'rounded-rf-xs hover:underline';

function Fact({ children }: { children: ReactNode }): JSX.Element {
  return <span className="whitespace-nowrap">{children}</span>;
}

/**
 * "Customers" and one sentence of company-wide facts, each read from the
 * screen that owns it:
 *  - customers, sites — the customers overview;
 *  - ₹ in open quotes — the quotes dashboard's pipeline, linked to the quote
 *    list holding exactly those deals;
 *  - follow-ups overdue — the follow-ups summary for everyone, linked to the
 *    Overdue tab it counts.
 * A figure that has not loaded (or that this user may not read) is left out
 * rather than shown as zero.
 */
export function ListHeader({
  onAddCustomer,
  canAddCustomer,
}: {
  onAddCustomer: () => void;
  canAddCustomer: boolean;
}): JSX.Element {
  const { data: overview } = useCustomerOverviewStats();
  const { data: quotes } = useQuotesDashboard(OPEN_QUOTES_FILTERS);
  const { data: followups } = useFollowupSummary(false);

  const pipeline = quotes?.strip.pipeline;
  const facts: ReactNode[] = [];

  if (overview) {
    facts.push(
      <Fact key="customers">
        <b className={FIGURE} title={`${formatNumber(overview.customersThisMonth)} new this month`}>
          <AnimatedNumber value={overview.customers} />
        </b>{' '}
        {overview.customers === 1 ? 'customer' : 'customers'}
      </Fact>,
      <Fact key="sites">
        <b className={FIGURE} title={`${formatNumber(overview.sitesThisMonth)} new this month`}>
          <AnimatedNumber value={overview.sites} />
        </b>{' '}
        {overview.sites === 1 ? 'site' : 'sites'}
      </Fact>,
    );
  }

  if (pipeline) {
    facts.push(
      <Fact key="quotes">
        <Link
          href={customerLinks.openQuotes()}
          prefetch={false}
          title={`${formatCurrency(pipeline.valueRupees)} across ${formatNumber(pipeline.count)} open ${
            pipeline.count === 1 ? 'deal' : 'deals'
          } (quote sent, waiting or quiet) — open the list`}
          className={cn(FIGURE, LINKED)}
        >
          <AnimatedNumber value={pipeline.valueRupees} format={formatCurrencyCompact} />
        </Link>{' '}
        in open quotes
      </Fact>,
    );
  }

  if (followups) {
    facts.push(
      <Fact key="overdue">
        <Link
          href={customerLinks.overdueFollowups()}
          prefetch={false}
          title="Open follow-ups scheduled before today, for everyone — open the list"
          className={cn(FIGURE, LINKED, followups.overdue > 0 && 'text-error')}
        >
          <AnimatedNumber value={followups.overdue} />
        </Link>{' '}
        {followups.overdue === 1 ? 'follow-up overdue' : 'follow-ups overdue'}
      </Fact>,
    );
  }

  return (
    <header className="mb-[26px] flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-semibold leading-[1.45] tracking-[-0.02em]">
          Customers
        </h1>
        <p className="mt-1 min-h-[1.45em] text-[14px] text-foreground-secondary">
          {facts.map((fact, index) => (
            <span key={index}>
              {index > 0 ? ' · ' : null}
              {fact}
            </span>
          ))}
        </p>
      </div>
      <button
        type="button"
        onClick={onAddCustomer}
        aria-disabled={!canAddCustomer}
        className={cn(
          'flex-none rounded-pill bg-primary px-[18px] py-2.5 text-[14px] font-medium text-white shadow-calm-cta',
          'transition-transform duration-200 ease-calm hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          !canAddCustomer && 'opacity-50',
        )}
      >
        + Add customer
      </button>
    </header>
  );
}
