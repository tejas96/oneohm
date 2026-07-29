'use client';

import {
  Box,
  Card,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { type JSX, useState } from 'react';

import { MUITypography } from '@/components/ui';
import {
  useCashFlow,
  useFinanceKpis,
  useLedgerEntries,
  type LedgerDirection,
  type LedgerEntry,
} from '@/lib/hooks/resources/ledger';
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
  const range = resolvePreset(preset);

  const kpis = useFinanceKpis(range.from, range.to);
  const cashFlow = useCashFlow(range.from, range.to, preset === 'today' ? 'day' : 'month');
  const entries = useLedgerEntries({ ...range, direction, limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <MUITypography variant="drawerTitle" component="h1">
            Finance
          </MUITypography>
          {/* The active period is always visible — misreading it is the error
              this layout is designed against. */}
          <MUITypography variant="body" sx={{ mt: 0.25 }}>
            {range.from} to {range.to}
          </MUITypography>
        </div>
        {/* ToggleButtonGroup carries the selected state, keyboard semantics and
            palette that the hand-rolled buttons faked with Tailwind classes. */}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={preset}
          onChange={(_, next: PresetKey | null) => next && setPreset(next)}
          aria-label="Reporting period"
        >
          {PRESETS.map((p) => (
            <ToggleButton key={p.key} value={p.key}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </header>

      {kpis.isLoading ? <Skeleton variant="rounded" height={104} /> : <KpiStrip data={kpis.data} />}

      <CashFlowChart points={cashFlow.data ?? []} isLoading={cashFlow.isLoading} />

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <MUITypography variant="sectionTitle">Ledger</MUITypography>
          <ToggleButtonGroup
            exclusive
            size="small"
            // 'all' stands in for undefined: ToggleButtonGroup cannot use
            // undefined as a value without treating the group as deselected.
            value={direction ?? 'all'}
            onChange={(_, next: string | null) =>
              next && setDirection(next === 'all' ? undefined : (next as 'in' | 'out'))
            }
            aria-label="Filter ledger direction"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="in">Money in</ToggleButton>
            <ToggleButton value="out">Money out</ToggleButton>
          </ToggleButtonGroup>
        </div>
        <EntriesTable
          entries={entries.data?.data ?? []}
          total={entries.data?.total ?? 0}
          isLoading={entries.isLoading}
        />
      </section>
    </div>
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

/** The org-wide query joins project and customer columns onto each entry. */
type OrgLedgerEntry = LedgerEntry & {
  projectNumber?: string | null;
  projectName?: string | null;
  customerName?: string | null;
};

function EntriesTable({
  entries,
  total,
  isLoading,
}: {
  entries: OrgLedgerEntry[];
  total: number;
  isLoading: boolean;
}): JSX.Element {
  if (isLoading) return <Skeleton variant="rounded" height={200} />;

  if (entries.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
        <MUITypography variant="placeholder">Nothing recorded in this period.</MUITypography>
      </Card>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Entry</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Customer / payee</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                {e.valueDate}
                {e.valueDateIsInferred && (
                  <Tooltip title="Date inferred from the record's creation time">
                    <span> ~</span>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>
                {e.entryNo}
              </TableCell>
              <TableCell>{e.projectNumber ?? '—'}</TableCell>
              <TableCell>{e.customerName ?? e.counterparty ?? '—'}</TableCell>
              <TableCell
                align="right"
                sx={{
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  color: e.amountPaise < 0 ? 'error.main' : 'success.main',
                }}
              >
                {formatPaise(e.amountPaise)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total > entries.length && (
        <MUITypography
          variant="finePrint"
          sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider' }}
        >
          Showing {entries.length} of {total}
        </MUITypography>
      )}
    </TableContainer>
  );
}
