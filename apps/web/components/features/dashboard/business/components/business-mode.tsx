'use client';

import * as React from 'react';

import { CashFlowCard } from './cash-flow-card';
import { HeadlineBand, type HeadlineTile } from './headline-band';
import { LeadsWonCard } from './leads-won-card';
import { MoneyOwedCard } from './money-owed-card';
import { SalesPipelineCard } from './sales-pipeline-card';
import { SalespeopleCard } from './salespeople-card';
import { ServiceLoadCard } from './service-load-card';
import { WorkloadCard } from './workload-card';
import { currentMonthRange, money, rupeesExact, type MoneyFormat } from '../lib/format';
import { businessLinks, type BusinessRange } from '../lib/links';

import { useServiceTicketStats } from '@/components/features/service-tickets/hooks/use-service-tickets';
import { useOrgCustomersAr, useOrgOutstanding } from '@/lib/hooks/resources/finance-org';
import { useCashFlow, useFinanceKpis } from '@/lib/hooks/resources/ledger';
import { usePipelineDashboard } from '@/lib/hooks/resources/pipeline';
import { useWorkload } from '@/lib/hooks/resources/workload';
import { useCan } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const OLDEST_DEBT_ROWS = 3;

interface BusinessModeProps {
  /** Passed down so the header, the body and every outgoing link agree. */
  range: BusinessRange;
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

  // Business mode aggregates five modules, and each one's data carries its own
  // permission everywhere else in the app. Showing the sales funnel to someone
  // `/pipeline` refuses is the same leak as showing them cash — it was simply
  // less obvious, because the pipeline gate lives on a route rather than a
  // number. Each panel group is gated by the permission its own data needs.
  const showMoney = can('finance.view');
  const showSales = can('pipeline.view');
  const showService = can('service.view');
  const showWorkload = can('workload.view');

  // Rendering may run on the permissions persisted from the last visit, which
  // avoids a flash of missing panels and self-corrects a moment later. FETCHING
  // may not: a permission revoked since that visit would still let its request
  // go out, and the data would be in the browser before the correction lands.
  // Every query below waits for /auth/me to confirm.
  const { permissionsConfirmed } = useAuth();
  const mayFetch = (permitted: boolean): boolean => permitted && permissionsConfirmed;

  // Both finance calls are gated, not just the panels they feed.
  //
  // `meterInstallations` is an operations figure, but it is SERVED BY the
  // finance KPI endpoint alongside revenue, spend and outstanding. Showing it
  // to someone without finance.view meant pulling that whole payload into their
  // browser to render one number from it. Installations is therefore treated as
  // finance data, and the hero falls back to sales or service instead.
  const kpis = useFinanceKpis(range.from, range.to, undefined, { enabled: mayFetch(showMoney) });
  const cashFlow = useCashFlow(range.from, range.to, 'day', { enabled: mayFetch(showMoney) });
  const pipeline = usePipelineDashboard({
    window: { fromDate: range.from, toDate: range.to },
    enabled: mayFetch(showSales),
  });
  const aging = useOrgCustomersAr({ enabled: mayFetch(showMoney) });
  const outstanding = useOrgOutstanding({ limit: OLDEST_DEBT_ROWS }, { enabled: mayFetch(showMoney) });
  const tickets = useServiceTicketStats(mayFetch(showService));
  const workload = useWorkload(
    { fromDate: range.from, toDate: range.to },
    { enabled: mayFetch(showWorkload) },
  );

  const k = kpis.data;
  const stats = pipeline.data?.stats;
  const stages = pipeline.data?.funnel.stages ?? [];
  const wonStage = stages[stages.length - 1];
  const lostCount = pipeline.data?.funnel.lostCount ?? 0;
  const lostValue = pipeline.data?.funnel.lostValue ?? 0;
  // No cast: the hook already types this, and casting would hide the day a
  // field is renamed upstream.
  const ticketStats = tickets.data;

  const compact = format === 'short';

  // The hero is whichever permitted figure best answers "is this month OK".
  // Money first, then sales, then service. When none is permitted there is no
  // hero at all and the band is not rendered — see `nothingToShow`.
  const hero = showMoney
    ? {
        label: 'Net cash flow',
        value: money(k?.netCashflowInRange ?? 0, format),
        exact: compact ? rupeesExact(k?.netCashflowInRange ?? 0) : undefined,
        sub: 'Money in minus money out',
        isBad: (k?.netCashflowInRange ?? 0) < 0,
        href: businessLinks.finance(),
        gate: 'finance.view' as const,
      }
    : showSales
      ? {
          label: 'Pipeline value',
          value: money(stats?.totalPipelineValue ?? 0, format),
          sub: `Open work across ${stages[0]?.count ?? 0} ${stages[0]?.label.toLowerCase() ?? 'leads'}`,
          href: businessLinks.pipeline(range),
          gate: 'pipeline.view' as const,
        }
      : {
          label: 'Active tickets',
          value: String((ticketStats?.open ?? 0) + (ticketStats?.inProgress ?? 0)),
          sub: ticketStats?.urgent
            ? `${ticketStats.urgent} urgent and still active`
            : 'No urgent tickets',
          // Deliberately NOT flagged bad. Ten open tickets is a working week,
          // not a failure; painting the headline red for it spends the one
          // colour on this screen that should mean "something is wrong".
          href: businessLinks.service(),
          gate: 'service.view' as const,
        };

  // Each tile is offered only if its own data is permitted. Without finance the
  // band would otherwise hold a single lonely figure, so it refills from sales
  // and service — but only with whatever the viewer is actually allowed to see.
  const moneyTiles: HeadlineTile[] = [
    {
      label: 'Money in',
      value: money(k?.revenueInRange ?? 0, format),
      sub: `${k?.receiptCountInRange ?? 0} receipts`,
      href: businessLinks.finance(),
      gate: 'finance.view',
    },
    {
      label: 'Money out',
      value: money(k?.spendInRange ?? 0, format),
      sub: `${k?.expenseCountInRange ?? 0} payments`,
      href: businessLinks.finance(),
      gate: 'finance.view',
    },
    {
      label: 'Outstanding now',
      value: money(k?.outstandingNow ?? 0, format),
      sub: `${k?.overdueCountNow ?? 0} overdue`,
      subIsBad: (k?.overdueCountNow ?? 0) > 0,
      // `/finance/receivables` needs its OWN code, not plain finance.view.
      href: businessLinks.receivables(),
      gate: 'finance.receivables.view',
    },
  ];

  const salesTiles: HeadlineTile[] = [
    {
      label: 'Pipeline value',
      value: money(stats?.totalPipelineValue ?? 0, format),
      sub: `${stages[0]?.count ?? 0} ${stages[0]?.label.toLowerCase() ?? 'leads'}`,
      href: businessLinks.pipeline(range),
      gate: 'pipeline.view',
    },
    {
      label: 'Deals won',
      value: String(wonStage?.count ?? 0),
      sub: money(wonStage?.value ?? 0, format),
      href: businessLinks.pipeline(range),
      gate: 'pipeline.view',
    },
    {
      label: 'Win rate',
      value: `${stats?.winRate ?? 0}%`,
      sub: `${lostCount} lost`,
      href: businessLinks.pipeline(range),
      gate: 'pipeline.view',
    },
  ];

  const installationsTile: HeadlineTile = {
    label: 'Installations',
    value: String(k?.meterInstallations ?? 0),
    sub: 'meters commissioned',
    href: businessLinks.projects(),
    gate: 'projects.view',
  };

  const serviceTile: HeadlineTile = {
    label: 'Active tickets',
    value: String((ticketStats?.open ?? 0) + (ticketStats?.inProgress ?? 0)),
    sub: ticketStats?.urgent ? `${ticketStats.urgent} urgent` : 'none urgent',
    subIsBad: Boolean(ticketStats?.urgent),
    href: businessLinks.service(),
    gate: 'service.view',
  };

  // Up to four slots beside the hero. Money first, then sales, then the singles.
  //
  // The installations tile is dropped when the hero is already showing that
  // exact figure, which happens whenever money is hidden. Printing one number
  // twice on one band makes the reader hunt for the difference between them.
  const tiles: HeadlineTile[] = [
    ...(showMoney ? moneyTiles : []),
    // `slice(1)` when sales supplies the hero: pipeline value is already the
    // big number, and printing it again beside itself helps nobody.
    ...(showSales && !showMoney ? salesTiles.slice(1) : []),
    ...(showMoney ? [installationsTile] : []),
    ...(showService && (showMoney || showSales) ? [serviceTile] : []),
  ].slice(0, 4);

  const serviceCard = showService ? (
    <ServiceLoadCard
      key="service"
      stats={ticketStats}
      isError={tickets.isError}
      onRetry={() => void tickets.refetch()}
    />
  ) : null;

  const salesCard = showSales ? (
    <SalesPipelineCard
      key="sales"
      stages={stages}
      lostCount={lostCount}
      lostValue={lostValue}
      stats={stats}
      wonCount={wonStage?.count ?? 0}
      format={format}
      range={range}
      isError={pipeline.isError}
      onRetry={() => void pipeline.refetch()}
    />
  ) : null;

  // Columns are assembled from what the viewer may see, rather than rendered
  // with holes in them. Service moves left when there is no money panel to
  // balance the right column, which is what the design's no-finance variant does.
  const leftPanels = [
    showMoney ? (
      <CashFlowCard
        key="cash"
        points={cashFlow.data ?? []}
        net={k?.netCashflowInRange ?? 0}
        format={format}
        rangeLabel={range.label}
        isError={cashFlow.isError}
        onRetry={() => void cashFlow.refetch()}
      />
    ) : null,
    salesCard,
    showWorkload ? (
      <WorkloadCard
        key="workload"
        departments={workload.data?.departments ?? []}
        totalPending={workload.data?.totalPending ?? 0}
        rangeLabel={range.label}
        isError={workload.isError}
        onRetry={() => void workload.refetch()}
      />
    ) : null,
    showMoney ? (
      <MoneyOwedCard
        key="owed"
        aging={aging.data ?? []}
        oldest={outstanding.data?.data ?? []}
        overdueCount={k?.overdueCountNow ?? 0}
        totalOutstanding={k?.outstandingNow ?? 0}
        overdueAmount={k?.overdueNow ?? 0}
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
    ),
  ].filter(Boolean);

  const rightPanels = [
    showSales ? (
      <LeadsWonCard
        key="trend"
        points={pipeline.data?.trend.points ?? []}
        granularity={pipeline.data?.trend.granularity ?? 'week'}
        range={range}
        isError={pipeline.isError}
        onRetry={() => void pipeline.refetch()}
      />
    ) : null,
    showSales ? (
      <SalespeopleCard
        key="people"
        entries={pipeline.data?.leaderboard.entries ?? []}
        format={format}
        range={range}
        isError={pipeline.isError}
        onRetry={() => void pipeline.refetch()}
      />
    ) : null,
    showMoney ? serviceCard : null,
  ].filter(Boolean);

  // Someone may hold dashboard.business.view and nothing else. Rather than an
  // almost-empty screen, say what is missing — the numbers here belong to other
  // modules, and this mode has nothing of its own to fall back on.
  const nothingToShow = !showMoney && !showSales && !showService && !showWorkload;

  // The band leads with a figure the panels beneath then repeat. That is fine
  // when it is summarising several of them, and pointless when service is the
  // only permitted source — the Service load panel already says "10 active now"
  // in the same words. In that case the panel is the whole screen.
  const showBand = showMoney || showSales;

  return (
    <div>
      {showBand ? (
        <HeadlineBand hero={hero} tiles={tiles} rangeLabel={range.label} compact={compact} />
      ) : null}

      {nothingToShow ? (
        <section className="rounded-3xl bg-surface px-[22px] py-8 shadow-e2">
          <p className="text-[13.5px] text-foreground-secondary">
            Business mode reads from the finance, sales and service modules, and your role has
            access to none of them. Ask a superadmin for <code>finance.view</code>,{' '}
            <code>pipeline.view</code> or <code>service.view</code>.
          </p>
        </section>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 items-start gap-6',
            // Reserving the rail when nothing can fill it squeezes the left
            // column against an empty 384px of canvas.
            rightPanels.length > 0 && 'xl:grid-cols-[minmax(0,1fr)_384px]',
          )}
        >
          <div className="flex flex-col gap-6">{leftPanels}</div>
          {rightPanels.length > 0 ? (
            <div className="flex flex-col gap-6">{rightPanels}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export { currentMonthRange };
