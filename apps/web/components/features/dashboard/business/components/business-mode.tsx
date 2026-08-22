'use client';

import * as React from 'react';

import { CashFlowCard } from './cash-flow-card';
import { HeadlineBand, type HeadlineTile } from './headline-band';
import { LeadsWonCard } from './leads-won-card';
import { MoneyOwedCard } from './money-owed-card';
import { SalesPipelineCard } from './sales-pipeline-card';
import { SalespeopleCard } from './salespeople-card';
import { ServiceLoadCard, type ServiceStats } from './service-load-card';
import { currentMonthRange, money, rupeesExact, type MoneyFormat } from '../lib/format';

import { useServiceTicketStats } from '@/components/features/service-tickets/hooks/use-service-tickets';
import { useOrgCustomersAr, useOrgOutstanding } from '@/lib/hooks/resources/finance-org';
import { useCashFlow, useFinanceKpis } from '@/lib/hooks/resources/ledger';
import { usePipelineDashboard } from '@/lib/hooks/resources/pipeline';
import { useCan } from '@/lib/rbac';

const OLDEST_DEBT_ROWS = 3;

interface BusinessModeProps {
  /** Passed down so the header and this body agree on the period. */
  range: { from: string; to: string; label: string };
  format: MoneyFormat;
}

/**
 * The organisation-wide view of the dashboard.
 *
 * Every panel has its own query rather than one combined call. That is the
 * whole reason a failed section can show a retry while the other six render —
 * with a single request, one bad join blanks the page.
 *
 * Nothing here is gated server-side. These endpoints are already open to any
 * authenticated user and this screen adds no new exposure; what it adds is a
 * place to see them together, which is what `dashboard.business.view` governs.
 */
export function BusinessMode({ range, format }: BusinessModeProps): React.JSX.Element {
  const { can } = useCan();
  const showMoney = can('finance.view');

  const kpis = useFinanceKpis(range.from, range.to);
  const cashFlow = useCashFlow(range.from, range.to, 'day');
  const pipeline = usePipelineDashboard({
    window: { fromDate: range.from, toDate: range.to },
  });
  const aging = useOrgCustomersAr({ enabled: showMoney });
  const outstanding = useOrgOutstanding({ limit: OLDEST_DEBT_ROWS }, { enabled: showMoney });
  const tickets = useServiceTicketStats();

  const k = kpis.data;
  const stats = pipeline.data?.stats;
  const stages = pipeline.data?.funnel.stages ?? [];
  const wonStage = stages[stages.length - 1];
  const lostCount = pipeline.data?.funnel.lostCount ?? 0;
  const lostValue = pipeline.data?.funnel.lostValue ?? 0;
  const ticketStats = tickets.data as ServiceStats | undefined;

  const compact = format === 'short';

  // Without finance access the band would be left holding a single figure, so
  // it refills with numbers that are not finance-gated. Pipeline value comes
  // from the sales endpoint, so it survives the gate.
  const hero = showMoney
    ? {
        label: 'Net cash flow',
        value: money(k?.netCashflowInRange ?? 0, format),
        exact: compact ? rupeesExact(k?.netCashflowInRange ?? 0) : undefined,
        sub: 'Money in minus money out',
        isBad: (k?.netCashflowInRange ?? 0) < 0,
        href: '/finance',
      }
    : {
        label: 'Installations completed',
        value: String(k?.meterInstallations ?? 0),
        sub: 'Meters commissioned in the period',
        href: '/projects',
      };

  const tiles: HeadlineTile[] = showMoney
    ? [
        {
          label: 'Money in',
          value: money(k?.revenueInRange ?? 0, format),
          sub: `${k?.receiptCountInRange ?? 0} receipts`,
          href: '/finance',
        },
        {
          label: 'Money out',
          value: money(k?.spendInRange ?? 0, format),
          sub: `${k?.expenseCountInRange ?? 0} payments`,
          href: '/finance',
        },
        {
          label: 'Outstanding now',
          value: money(k?.outstandingNow ?? 0, format),
          sub: `${k?.overdueCountNow ?? 0} overdue`,
          subIsBad: (k?.overdueCountNow ?? 0) > 0,
          href: '/finance/receivables',
        },
        {
          label: 'Installations',
          value: String(k?.meterInstallations ?? 0),
          sub: 'meters commissioned',
          href: '/projects',
        },
      ]
    : [
        {
          label: 'Pipeline value',
          value: money(stats?.totalPipelineValue ?? 0, format),
          sub: `${stages[0]?.count ?? 0} ${stages[0]?.label.toLowerCase() ?? 'leads'}`,
          href: '/pipeline',
        },
        {
          label: 'Deals won',
          value: String(wonStage?.count ?? 0),
          sub: money(wonStage?.value ?? 0, format),
          href: '/pipeline',
        },
        {
          label: 'Win rate',
          value: `${stats?.winRate ?? 0}%`,
          sub: `${lostCount} lost`,
          href: '/pipeline',
        },
        {
          label: 'Active tickets',
          value: String((ticketStats?.open ?? 0) + (ticketStats?.inProgress ?? 0)),
          sub: ticketStats?.urgent ? `${ticketStats.urgent} urgent` : 'none urgent',
          subIsBad: Boolean(ticketStats?.urgent),
          href: '/service',
        },
      ];

  const serviceCard = (
    <ServiceLoadCard
      stats={ticketStats}
      isError={tickets.isError}
      onRetry={() => void tickets.refetch()}
    />
  );

  return (
    <div>
      <HeadlineBand hero={hero} tiles={tiles} rangeLabel={range.label} compact={compact} />

      {/* Fluid main column, like My Work. At the shell's 1192px content width this
          resolves to exactly the design's 736px; on a wider window it grows rather
          than leaving a dead strip down the right. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_384px]">
        <div className="flex flex-col gap-6">
          {showMoney ? (
            <CashFlowCard
              points={cashFlow.data ?? []}
              net={k?.netCashflowInRange ?? 0}
              format={format}
              rangeLabel={range.label}
              isError={cashFlow.isError}
              onRetry={() => void cashFlow.refetch()}
            />
          ) : null}

          <SalesPipelineCard
            stages={stages}
            lostCount={lostCount}
            lostValue={lostValue}
            stats={stats}
            wonCount={wonStage?.count ?? 0}
            format={format}
            rangeLabel={range.label}
            isError={pipeline.isError}
            onRetry={() => void pipeline.refetch()}
          />

          {showMoney ? (
            <MoneyOwedCard
              aging={aging.data ?? []}
              oldest={outstanding.data?.data ?? []}
              overdueCount={k?.overdueCountNow ?? 0}
              unallocatedCredit={k?.unallocatedCredit ?? 0}
              format={format}
              today={new Date()}
              isError={aging.isError || outstanding.isError}
              onRetry={() => {
                void aging.refetch();
                void outstanding.refetch();
              }}
            />
          ) : (
            serviceCard
          )}
        </div>

        <div className="flex flex-col gap-6">
          <LeadsWonCard
            points={pipeline.data?.trend.points ?? []}
            granularity={pipeline.data?.trend.granularity ?? 'week'}
            isError={pipeline.isError}
            onRetry={() => void pipeline.refetch()}
          />

          <SalespeopleCard
            entries={pipeline.data?.leaderboard.entries ?? []}
            format={format}
            isError={pipeline.isError}
            onRetry={() => void pipeline.refetch()}
          />

          {showMoney ? serviceCard : null}
        </div>
      </div>
    </div>
  );
}

export { currentMonthRange };
