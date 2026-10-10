'use client';

import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { customerLinks, OPEN_QUOTES_FILTERS } from './links';
import { useCustomerOverviewStats } from '../../hooks/use-customers';

import { AnimatedNumber } from '@/components/features/dashboard/kit';
import { useFollowupSummary } from '@/components/features/followups';
import { formatRupees } from '@/components/features/quotes/components/dashboard/strip';
import { ListTitle, PrimaryAction } from '@/components/shared/calm-list';
import { useQuotesDashboard } from '@/lib/hooks/resources';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

const FIGURE = 'font-semibold tabular-nums text-foreground';
const LINKED = 'rounded-rf-xs hover:underline';

function Fact({ children }: { children: ReactNode }): JSX.Element {
  return <span className="whitespace-nowrap">{children}</span>;
}

/**
 * "Customers" and one sentence of company-wide facts, each read from the
 * screen that owns it:
 *  - customers, sites — the customers overview;
 *  - ₹ in open quotes — the quotes dashboard's pipeline, written with that
 *    dashboard's own money format and linked to the quote list holding exactly
 *    those deals;
 *  - follow-ups overdue — the follow-ups summary for everyone (site visits and
 *    surveys are not in it), linked to the Overdue tab it counts.
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
  const facts: { key: string; node: ReactNode }[] = [];

  if (overview) {
    facts.push(
      {
        key: 'customers',
        node: (
          <Fact>
            <b
              className={FIGURE}
              title={`${formatNumber(overview.customersThisMonth)} new this month`}
            >
              <AnimatedNumber value={overview.customers} />
            </b>{' '}
            {overview.customers === 1 ? 'customer' : 'customers'}
          </Fact>
        ),
      },
      {
        key: 'sites',
        node: (
          <Fact>
            <b className={FIGURE} title={`${formatNumber(overview.sitesThisMonth)} new this month`}>
              <AnimatedNumber value={overview.sites} />
            </b>{' '}
            {overview.sites === 1 ? 'site' : 'sites'}
          </Fact>
        ),
      },
    );
  }

  if (pipeline) {
    facts.push({
      key: 'quotes',
      node: (
        <Fact>
          <Link
            href={customerLinks.openQuotes()}
            prefetch={false}
            title={`${formatCurrency(pipeline.valueRupees)} across ${formatNumber(pipeline.count)} open ${
              pipeline.count === 1 ? 'deal' : 'deals'
            } (quote sent, waiting or quiet) — open the list`}
            className={cn(FIGURE, LINKED)}
          >
            <AnimatedNumber value={pipeline.valueRupees} format={formatRupees} />
          </Link>{' '}
          in open quotes
        </Fact>
      ),
    });
  }

  if (followups) {
    facts.push({
      key: 'overdue',
      node: (
        <Fact>
          <Link
            href={customerLinks.overdueFollowups()}
            prefetch={false}
            title="Open follow-ups scheduled before today, for everyone. Site visits and surveys are not counted — open the list"
            className={cn(FIGURE, LINKED, followups.overdue > 0 && 'text-error')}
          >
            <AnimatedNumber value={followups.overdue} />
          </Link>{' '}
          {followups.overdue === 1 ? 'follow-up overdue' : 'follow-ups overdue'}
        </Fact>
      ),
    });
  }

  return (
    <ListTitle
      title="Customers"
      sub={
        // Keyed by the fact, not its position: a fact that loads later must not
        // remount (and restart the count-up of) the ones after it.
        facts.map((fact, index) => (
          <span key={fact.key}>
            {index > 0 ? ' · ' : null}
            {fact.node}
          </span>
        ))
      }
      actions={
        <PrimaryAction onClick={onAddCustomer} allowed={canAddCustomer}>
          + Add customer
        </PrimaryAction>
      }
    />
  );
}
