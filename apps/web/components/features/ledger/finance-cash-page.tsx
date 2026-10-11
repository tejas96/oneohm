'use client';

import { Box, Tooltip } from '@mui/material';
import { type JSX, useState } from 'react';

import { CashRow, CashRowSkeleton } from './cash-row';

import { GatedLink } from '@/components/features/dashboard/business/components/gated-link';
import {
  BONE,
  CalmListPage,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  ListToolbar,
  PillTabs,
  Segment,
  SegmentCard,
  type SortOption,
  StatTile,
  StatTiles,
  type StatTone,
  useListEntrance,
} from '@/components/shared/calm-list';
import { ROUTES } from '@/lib/config/routes';
import type { TableUrlSortModel } from '@/lib/hooks';
import {
  useCashFlow,
  useFinanceKpis,
  useLedgerEntries,
  type LedgerDirection,
} from '@/lib/hooks/resources/ledger';
import type { Gate } from '@/lib/rbac';
import { cn, formatBusinessDate, formatCount, getErrorMessage } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/** IST today, matching how the backend stamps value dates. */
function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const PAGE_SIZE = 25;

/** Sort keys the API whitelists; anything else is dropped rather than guessed. */
const CASH_SORTABLE = ['valueDate', 'amountPaise', 'customerName'] as const;

type PresetKey = 'today' | 'month' | 'quarter' | 'fy' | 'year';

/**
 * The client asked for day / month / year. Quarter and financial year are here
 * because an Indian solar business reports on the April–March year, and leaving
 * that out would push every FY question into the custom range.
 */
function resolvePreset(key: PresetKey): { from: string; to: string } {
  const today = todayIst();
  const [y, m] = today.split('-').map(Number) as [number, number];
  const pad = (n: number): string => String(n).padStart(2, '0');
  const lastDay = (yy: number, mm: number): string => pad(new Date(yy, mm, 0).getDate());

  switch (key) {
    case 'today':
      return { from: today, to: today };
    case 'month':
      return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` };
    case 'quarter': {
      const qStart = m - ((m - 1) % 3);
      const qEnd = qStart + 2;
      return { from: `${y}-${pad(qStart)}-01`, to: `${y}-${pad(qEnd)}-${lastDay(y, qEnd)}` };
    }
    case 'fy': {
      // Indian financial year: April to March.
      const startYear = m >= 4 ? y : y - 1;
      return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
    }
    case 'year':
    default:
      return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

const PRESETS: Array<{ value: PresetKey; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'fy', label: 'This FY' },
  { value: 'year', label: 'This year' },
];

/**
 * The three sortable columns of the old table. With no sort the API orders by
 * value date, newest first — which is why "newest first" is the option that
 * sends none.
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', model: null },
  { label: 'Oldest first', model: { field: 'valueDate', direction: 'asc' } },
  { label: 'Amount: large to small', model: { field: 'amountPaise', direction: 'desc' } },
  { label: 'Amount: small to large', model: { field: 'amountPaise', direction: 'asc' } },
  { label: 'Customer A–Z', model: { field: 'customerName', direction: 'asc' } },
  { label: 'Customer Z–A', model: { field: 'customerName', direction: 'desc' } },
];

const ENTRY_NOUN = { one: 'entry', many: 'entries' };

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 12;

/** This list has no filter panel. */
const NO_FILTER_COLUMNS: never[] = [];
const NO_FILTERS = {};
const ignoreFilters = (): void => undefined;

/**
 * The finance dashboard.
 *
 * Replaces nine routes — dashboard, receipts, expenses, calendar, reports,
 * vendors, profitability, customers-AR and outstanding — with one screen whose
 * every number is driven by the selected period.
 *
 * The one exception is deliberate and called out in the UI: **outstanding and
 * credit are snapshots as of today**, not period figures. Money owed does not
 * belong to a month, and conflating the two is how a dashboard ends up claiming
 * a customer "owes ₹X in March".
 */
export function FinanceCashPage(): JSX.Element {
  const [preset, setPreset] = useState<PresetKey>('month');
  const [direction, setDirection] = useState<LedgerDirection | undefined>();
  // The pager's `page` is zero-indexed; the API is one-indexed.
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [sortModel, setSortModel] = useState<TableUrlSortModel | null>(null);
  const range = resolvePreset(preset);

  // Search narrows the period figures so the cards describe the rows on
  // screen. The direction view deliberately does not: the cards show money in
  // and money out side by side, so it is a list view, not a scope change.
  const kpis = useFinanceKpis(range.from, range.to, search || undefined);
  const grain = preset === 'today' ? 'day' : 'month';
  // The bars follow the search too, so they describe the same rows as the cards.
  const cashFlow = useCashFlow(range.from, range.to, grain, { search: search || undefined });
  const entries = useLedgerEntries({
    ...range,
    direction,
    search: search || undefined,
    sortBy: CASH_SORTABLE.find((f) => f === sortModel?.field),
    sortOrder: sortModel?.direction,
    page: page + 1,
    limit: pageSize,
  });

  const rows = entries.data?.data ?? [];

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  const chooseDirection = (next: LedgerDirection | undefined): void => {
    setDirection(next);
    setPage(0);
  };

  return (
    <CalmListPage
      // The figures and the chart would leave no room for the entries.
      pinHeader={false}
      header={
        <>
          <ListTitle
            title="Cash"
            // The active period is always visible — misreading it is the error
            // this layout is designed against.
            sub={`${formatBusinessDate(range.from)} to ${formatBusinessDate(range.to)}`}
            actions={
              <PillTabs
                label="Reporting period"
                options={PRESETS}
                value={preset}
                onChange={(next) => {
                  setPreset(next);
                  setPage(0);
                }}
              />
            }
          />

          {kpis.isLoading ? (
            <div
              role="status"
              aria-label="Loading figures"
              className={cn(BONE, 'mb-2.5 h-[104px] rounded-card-calm')}
            />
          ) : (
            <KpiStrip data={kpis.data} />
          )}

          <CashFlowChart
            points={cashFlow.data ?? []}
            grain={grain}
            isLoading={cashFlow.isLoading}
          />

          {/* Direction as quick views, matching how every other list filters. */}
          <SegmentCard label="Entries by direction">
            <Segment
              pressed={!direction}
              onClick={() => chooseDirection(undefined)}
              count={null}
              label="All"
            />
            <Segment
              pressed={direction === 'in'}
              onClick={() => chooseDirection('in')}
              count={null}
              label="Money in"
              dot="var(--ds-primary)"
            />
            <Segment
              pressed={direction === 'out'}
              onClick={() => chooseDirection('out')}
              count={null}
              label="Money out"
              dot="var(--ds-info-soft)"
            />
          </SegmentCard>
        </>
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={(next) => {
            setSearch(next);
            setPage(0);
          }}
          searchPlaceholder="Search entry number, customer, project or reference"
          searchLabel="Search entries"
          // The ledger API searches on any length.
          searchMinLength={1}
          filterColumns={NO_FILTER_COLUMNS}
          filters={NO_FILTERS}
          onFilterChange={ignoreFilters}
          sortOptions={SORT_OPTIONS}
          sortModel={sortModel}
          onSortChange={(next) => {
            setSortModel(next);
            setPage(0);
          }}
        />
      }
      error={
        entries.isError ? (
          <ListError
            title="Couldn’t load the entries"
            message={getErrorMessage(entries.error)}
            onRetry={() => void entries.refetch()}
          />
        ) : null
      }
      isFetching={entries.isFetching}
      isLoading={entries.isLoading}
      page={page}
      footer={
        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={entries.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(0);
          }}
          noun={ENTRY_NOUN}
          countUnknown={entries.isError && !entries.data}
        />
      }
    >
      {entries.isLoading ? (
        <ListSkeleton
          rows={Math.min(pageSize, MAX_SKELETON_ROWS)}
          label="Loading entries"
          renderRow={() => <CashRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        entries.isError ? null : (
          <ListEmpty
            title={search ? 'No entry matches' : 'Nothing recorded in this period.'}
            hint={search ? 'Try another entry number, customer, project or reference.' : undefined}
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <CashRow key={row.id} row={row} index={index} entering={entering} />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}

function KpiStrip({
  data,
}: {
  data?: import('@/lib/hooks/resources/ledger').FinanceKpis;
}): JSX.Element {
  const rupees = (v: number): string => formatPaise(Math.round((v ?? 0) * 100));

  const flows: Array<{
    label: string;
    value: string;
    sub: string;
    tone: StatTone;
    href?: string;
    gate?: Gate;
  }> = [
    {
      label: 'Received',
      value: rupees(data?.revenueInRange ?? 0),
      sub: formatCount(data?.receiptCountInRange ?? 0, 'receipt'),
      tone: 'success',
    },
    {
      // What the work cost in cash. Vendor payments are named in the count,
      // not folded into "expenses" — a payment settling a bill is not a new
      // expense.
      label: 'Spent',
      value: rupees(data?.spendInRange ?? 0),
      sub: [
        formatCount(data?.expenseCountInRange ?? 0, 'expense'),
        (data?.vendorPaymentCountInRange ?? 0) > 0
          ? formatCount(data?.vendorPaymentCountInRange ?? 0, 'vendor payment')
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      tone: 'default',
    },
    {
      // Money handed back to customers is not what the work cost, so it is
      // not in Spent — the project money card has kept the two apart since
      // refunds existed. Net subtracts both, so it reconciles on screen.
      label: 'Refunded',
      value: rupees(data?.refundInRange ?? 0),
      sub: formatCount(data?.refundCountInRange ?? 0, 'refund'),
      tone: 'default',
    },
    {
      label: 'Net',
      value: rupees(data?.netCashflowInRange ?? 0),
      sub: 'in period',
      tone: (data?.netCashflowInRange ?? 0) < 0 ? 'danger' : 'success',
    },
    {
      // This used to count TASKS carrying the "Net meter installation" stage
      // name — 65 all-time, because 26 projects carry that stage on more
      // than one task. It now counts the PROJECTS themselves (41): a project
      // has one net meter. The label says so, rather than let a ~38% drop
      // read as a regression instead of a fix. Opens Recovery — Cash, which is
      // selected by this same commissioning event; Loan is one click away.
      label: 'Projects commissioned',
      value: String(data?.meterInstallations ?? 0),
      // The list it opens is not these projects: it is every commissioned job
      // that still owes money, whatever the period. Said here, so "40" opening
      // a list of 23 is not a surprise.
      sub: 'net meter installed · jobs still owing →',
      tone: 'default',
      href: `${ROUTES.FINANCE.RECEIVABLES}?scope=recovery-cash`,
      gate: 'finance.receivables.view',
    },
  ];

  const snapshots: Array<{ label: string; value: string; sub: string; tone: StatTone }> = [
    {
      label: 'Outstanding',
      value: rupees(data?.outstandingNow ?? 0),
      // Milestones, not projects or customers: one job can carry several.
      sub: `${formatCount(data?.overdueCountNow ?? 0, 'milestone')} overdue`,
      tone: 'warning',
    },
    {
      // The mirror of Outstanding, so both directions sit on one screen.
      // Already netted server-side — never summed here.
      label: 'Owed to vendors',
      value: rupees(data?.vendorPayable ?? 0),
      sub: 'to vendors',
      tone: 'default',
    },
    {
      label: 'Unapplied credit',
      value: rupees(data?.unallocatedCredit ?? 0),
      sub: 'received, not yet applied',
      tone: 'info',
    },
  ];

  // No figure without an answer: "₹0.00 received" on a failed request reads as
  // a period with no money. (This renders only once loading is over, so no
  // data means the request failed.)
  const shown = <T extends { value: string; sub: string; tone: StatTone }>(tiles: T[]): T[] =>
    data
      ? tiles
      : tiles.map((t) => ({
          ...t,
          value: '—',
          sub: 'could not load',
          tone: 'default' as StatTone,
        }));

  return (
    <div className="mb-2.5 flex flex-col gap-2.5">
      <StatTiles
        label="Figures for the selected period"
        className="grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
      >
        {shown(flows).map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </StatTiles>
      <div>
        <p className="m-0 mb-1.5 px-1 text-[12px] text-foreground-tertiary">
          As of today — not affected by the selected period or the search
        </p>
        <StatTiles label="Figures as of today" className="grid-cols-2 lg:grid-cols-3">
          {shown(snapshots).map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </StatTiles>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
  href,
  gate,
}: {
  label: string;
  value: string;
  sub: string;
  tone: StatTone;
  /** When set, the whole tile becomes a way in to that count's own screen. */
  href?: string;
  /** Permission gate the destination requires. Required when href is set. */
  gate?: Gate;
}): JSX.Element {
  const tile = (
    <StatTile label={label} value={value} note={sub} tone={tone} compact linked={Boolean(href)} />
  );

  if (!href) return tile;

  // Gated link: if a destination route requires a permission gate distinct
  // from this page's own gate (e.g., /finance/receivables needs
  // finance.receivables.view, not just finance.view), wrap in GatedLink to
  // show an access dialog instead of navigating to a permission wall.
  if (gate) {
    return (
      <GatedLink href={href} gate={gate}>
        {tile}
      </GatedLink>
    );
  }

  return tile;
}

/** Bar pair per period. Deliberately simple — a chart library is not needed here. */
function CashFlowChart({
  points,
  grain,
  isLoading,
}: {
  points: Array<{ month: string; cashIn: number; cashOut: number }>;
  grain: 'day' | 'month';
  isLoading: boolean;
}): JSX.Element {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading chart"
        className={cn(BONE, 'mb-2.5 h-[160px] rounded-card-calm')}
      />
    );
  }
  if (points.length === 0) return <></>;

  const peak = Math.max(...points.map((p) => Math.max(p.cashIn, p.cashOut)), 1);
  // The series is in rupees; the tooltip reads like every other amount here.
  const rupees = (v: number): string => formatPaise(Math.round(v * 100));
  // A bucket is the first day of its period. A day bucket said "2026-09".
  const bucketLabel = (bucket: string): string => {
    if (grain === 'day') return formatBusinessDate(bucket);
    const [y, m] = bucket.split('-').map(Number) as [number, number];
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  return (
    <section className="mb-2.5 rounded-card-calm bg-surface px-[22px] py-4 shadow-calm">
      <h2 className="m-0 mb-4 text-[14px] font-semibold">Money in vs out</h2>
      <div className="flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
        {points.map((p) => (
          <div key={p.month} className="flex min-w-14 flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end justify-center gap-1">
              {/* Bar fills come from the MUI palette, not Tailwind colour
                  utilities — the height is the only thing layout owns here. */}
              <Tooltip title={`In ${rupees(p.cashIn)}`}>
                <Box
                  sx={{ width: '50%', bgcolor: 'success.light', borderRadius: '4px 4px 0 0' }}
                  style={{ height: `${(p.cashIn / peak) * 100}%` }}
                />
              </Tooltip>
              <Tooltip title={`Out ${rupees(p.cashOut)}`}>
                <Box
                  sx={{ width: '50%', bgcolor: 'error.light', borderRadius: '4px 4px 0 0' }}
                  style={{ height: `${(p.cashOut / peak) * 100}%` }}
                />
              </Tooltip>
            </div>
            <span className="text-[12px] text-foreground-tertiary">{bucketLabel(p.month)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
