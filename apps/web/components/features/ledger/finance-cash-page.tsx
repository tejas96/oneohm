'use client';

import { Box, Card, Skeleton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { CASH_COLUMNS, type CashRow } from './cash-columns';

import type { TableSortModel } from '@/components/shared/advanced-table';
import { CrmTable, type CrmQuickFilter } from '@/components/shared/crm-table';
import { MUITypography } from '@/components/ui';
import {
  useCashFlow,
  useFinanceKpis,
  useLedgerEntries,
  type LedgerDirection,
} from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
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

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'fy', label: 'This FY' },
  { key: 'year', label: 'This year' },
];

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
  // CrmTable's `page` is zero-indexed; the API is one-indexed.
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortModel, setSortModel] = useState<TableSortModel | null>(null);
  const range = resolvePreset(preset);

  const kpis = useFinanceKpis(range.from, range.to);
  const cashFlow = useCashFlow(range.from, range.to, preset === 'today' ? 'day' : 'month');
  const entries = useLedgerEntries({
    ...range,
    direction,
    search: search || undefined,
    sortBy: CASH_SORTABLE.find((f) => f === sortModel?.field),
    sortOrder: sortModel?.direction,
    page: page + 1,
    limit: PAGE_SIZE,
  });

  const rows = (entries.data?.data ?? []) as CashRow[];

  /** Direction as chips, matching how every other list filters. */
  const quickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      { key: '', label: 'All', tone: 'neutral', dot: false },
      { key: 'in', label: 'Money in', tone: 'success', dot: true },
      { key: 'out', label: 'Money out', tone: 'info', dot: true },
    ],
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component="span"
            sx={{
              fontSize: 'var(--text-overline-size)',
              fontWeight: 700,
              letterSpacing: 'var(--text-overline-track)',
              textTransform: 'uppercase',
              color: color['text-tertiary'],
            }}
          >
            Finance
          </Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              mt: '5px',
              mb: '3px',
              fontSize: crm['text-page-title'],
              fontWeight: 700,
              letterSpacing: crm['text-page-title-track'],
            }}
          >
            Cash
          </Box>
          {/* The active period is always visible — misreading it is the error
              this layout is designed against. */}
          <Box
            component="p"
            sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
          >
            {range.from} to {range.to}
          </Box>
        </Box>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={preset}
          onChange={(_, next: PresetKey | null) => {
            if (next) {
              setPreset(next);
              setPage(0);
            }
          }}
          aria-label="Reporting period"
          sx={{ alignSelf: { lg: 'flex-start' }, mt: { lg: 2.25 } }}
        >
          {PRESETS.map((p) => (
            <ToggleButton key={p.key} value={p.key}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {kpis.isLoading ? <Skeleton variant="rounded" height={104} /> : <KpiStrip data={kpis.data} />}

      <CashFlowChart points={cashFlow.data ?? []} isLoading={cashFlow.isLoading} />

      <CrmTable<CashRow>
        columns={CASH_COLUMNS}
        rows={rows}
        getRowId={(row) => row.id}
        loading={entries.isLoading}
        refetching={entries.isFetching && !entries.isLoading}
        itemLabel="entries"
        gridMinWidth="900px"
        searchPlaceholder="Search entry number, customer, project or reference"
        onSearchChange={(next) => {
          setSearch(next);
          setPage(0);
        }}
        quickFilters={quickFilters}
        activeQuickFilter={direction ?? ''}
        onQuickFilterChange={(key) => {
          setDirection((key || undefined) as LedgerDirection | undefined);
          setPage(0);
        }}
        sortModel={sortModel}
        onSortChange={(next) => {
          setSortModel(next);
          setPage(0);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        totalRowCount={entries.data?.total ?? 0}
        onPageChange={setPage}
        emptyMessage="Nothing recorded in this period."
      />
    </Box>
  );
}

function KpiStrip({
  data,
}: {
  data?: import('@/lib/hooks/resources/ledger').FinanceKpis;
}): JSX.Element {
  const rupees = (v: number): string => formatPaise(Math.round((v ?? 0) * 100));

  const flows = [
    {
      label: 'Received',
      value: rupees(data?.revenueInRange ?? 0),
      sub: `${data?.receiptCountInRange ?? 0} receipts`,
      tone: 'success',
    },
    {
      label: 'Spent',
      value: rupees(data?.spendInRange ?? 0),
      sub: `${data?.expenseCountInRange ?? 0} expenses`,
      tone: 'default',
    },
    {
      label: 'Net',
      value: rupees(data?.netCashflowInRange ?? 0),
      sub: 'in period',
      tone: (data?.netCashflowInRange ?? 0) < 0 ? 'error' : 'success',
    },
    {
      label: 'Meter installations',
      value: String(data?.meterInstallations ?? 0),
      sub: 'completed',
      tone: 'default',
    },
  ];

  const snapshots = [
    {
      label: 'Outstanding',
      value: rupees(data?.outstandingNow ?? 0),
      sub: `${data?.overdueCountNow ?? 0} overdue`,
      tone: 'warning',
    },
    {
      label: 'Unapplied credit',
      value: rupees(data?.unallocatedCredit ?? 0),
      sub: 'received, not yet applied',
      tone: 'info',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {flows.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </dl>
      <div>
        <MUITypography variant="finePrint" sx={{ mb: 1 }}>
          As of today — not affected by the selected period
        </MUITypography>
        <dl className="grid grid-cols-2 gap-3">
          {snapshots.map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </dl>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}): JSX.Element {
  // MUI palette tokens rather than Tailwind colour utilities.
  const color =
    tone === 'success' || tone === 'warning' || tone === 'error' || tone === 'info'
      ? `${tone}.main`
      : 'text.primary';

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <MUITypography variant="metaLabel" component="dt">
        {label}
      </MUITypography>
      <MUITypography
        component="dd"
        variant="inherit"
        color={color}
        sx={{ mt: 0.5, fontSize: '1.125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </MUITypography>
      <MUITypography variant="finePrint" component="dd" sx={{ mt: 0.25 }}>
        {sub}
      </MUITypography>
    </Card>
  );
}

/** Bar pair per period. Deliberately simple — a chart library is not needed here. */
function CashFlowChart({
  points,
  isLoading,
}: {
  points: Array<{ month: string; cashIn: number; cashOut: number }>;
  isLoading: boolean;
}): JSX.Element {
  if (isLoading) return <Skeleton variant="rounded" height={160} />;
  if (points.length === 0) return <></>;

  const peak = Math.max(...points.map((p) => Math.max(p.cashIn, p.cashOut)), 1);

  return (
    <Card variant="outlined" component="section" sx={{ p: 2 }}>
      <MUITypography variant="sectionTitle" sx={{ mb: 2 }}>
        Money in vs out
      </MUITypography>
      <div className="flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
        {points.map((p) => (
          <div key={p.month} className="flex min-w-14 flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end justify-center gap-1">
              {/* Bar fills come from the MUI palette, not Tailwind colour
                  utilities — the height is the only thing layout owns here. */}
              <Tooltip title={`In ${p.cashIn}`}>
                <Box
                  sx={{ width: '50%', bgcolor: 'success.light', borderRadius: '4px 4px 0 0' }}
                  style={{ height: `${(p.cashIn / peak) * 100}%` }}
                />
              </Tooltip>
              <Tooltip title={`Out ${p.cashOut}`}>
                <Box
                  sx={{ width: '50%', bgcolor: 'error.light', borderRadius: '4px 4px 0 0' }}
                  style={{ height: `${(p.cashOut / peak) * 100}%` }}
                />
              </Tooltip>
            </div>
            <MUITypography variant="finePrint">{p.month.slice(0, 7)}</MUITypography>
          </div>
        ))}
      </div>
    </Card>
  );
}
