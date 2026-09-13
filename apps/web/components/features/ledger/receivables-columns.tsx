'use client';

import { Box, Button } from '@mui/material';
import { bankLabel } from '@tejas96/shared/constants';
import NextLink from 'next/link';
import { useState, type JSX } from 'react';

import { AttachBankDialog } from './attach-bank-dialog';

import { CrmStatusPill, type CrmColumn, type CrmTone } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { Receivable } from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

export type ReceivableRow = Receivable & Record<string, unknown>;

/**
 * Ageing bucket for a row.
 *
 * Colour is never the only signal — the label carries it too, so the list is
 * still readable to someone who cannot distinguish the tones.
 */
function ageingBucket(days: number): { label: string; tone: CrmTone } {
  // "Not due yet", matching the quick-filter chip's rename (finance-receivables-page.tsx)
  // — the two must agree, or a row's pill and the active chip describe the
  // same milestone in two different words.
  if (days <= 0) return { label: 'Not due yet', tone: 'neutral' };
  if (days <= 30) return { label: '1–30 days', tone: 'warning' };
  if (days <= 60) return { label: '31–60 days', tone: 'warning' };
  if (days <= 90) return { label: '61–90 days', tone: 'danger' };
  return { label: '90+ days', tone: 'danger' };
}

function Empty(): JSX.Element {
  return <Box sx={{ color: color['text-tertiary'] }}>—</Box>;
}

/**
 * `sortable` is set only where the API whitelists a sort key, so a header can
 * never ask for an ordering the server will silently ignore.
 */
export const RECEIVABLE_COLUMNS: CrmColumn<ReceivableRow>[] = [
  {
    field: 'customerName',
    header: 'Customer',
    track: crm['col-recv-customer'],
    sortable: true,
    renderCell: (row) =>
      row.customerName ? (
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontWeight: 600,
              fontSize: crm['text-row-title'],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.customerName}
          </Box>
          {row.customerPhone ? (
            <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
              {row.customerPhone}
            </Box>
          ) : null}
        </Box>
      ) : (
        <Empty />
      ),
  },
  {
    field: 'projectNumber',
    header: 'Project',
    track: crm['col-recv-project'],
    stopPropagation: true,
    renderCell: (row) => (
      <NextLink
        href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
        style={{ color: color.accent, textDecoration: 'none', fontWeight: 500 }}
      >
        {row.projectNumber}
      </NextLink>
    ),
  },
  {
    field: 'milestoneName',
    header: 'Milestone',
    track: crm['col-recv-milestone'],
    renderCell: (row) => (
      <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.milestoneName}
      </Box>
    ),
  },
  {
    field: 'dueDate',
    header: 'Due',
    track: crm['col-recv-due'],
    sortable: true,
    renderCell: (row) => (row.dueDate ? formatBusinessDate(row.dueDate) : <Empty />),
  },
  {
    field: 'expectedAmount',
    header: 'Expected',
    track: crm['col-recv-expected'],
    align: 'right',
    cellSx: { pr: 1.5 },
    renderCell: (row) => formatPaise(row.expectedPaise),
  },
  {
    field: 'paidAmount',
    header: 'Received',
    track: crm['col-recv-paid'],
    // Hidden by default: Expected and Short by carry the meaning, and the third
    // number is derivable from them. Revealable from the column menu.
    defaultHidden: true,
    align: 'right',
    cellSx: { pr: 1.5 },
    renderCell: (row) => formatPaise(row.allocatedPaise),
  },
  {
    field: 'outstandingAmount',
    header: 'Short by',
    track: crm['col-recv-outstanding'],
    sortable: true,
    align: 'right',
    cellSx: { pr: 1.5 },
    // The number the page exists for, so it carries the weight.
    renderCell: (row) => (
      <Box sx={{ fontWeight: 700, color: color.danger }}>
        {formatPaise(row.balancePaise)}
      </Box>
    ),
  },
  {
    field: 'daysOverdue',
    header: 'Ageing',
    track: crm['col-recv-ageing'],
    sortable: true,
    renderCell: (row) => {
      const { label, tone } = ageingBucket(row.daysOverdue);
      return <CrmStatusPill label={label} tone={tone} size="sm" />;
    },
  },
];

/**
 * The Bank cell owns its own dialog rather than lifting state to the page.
 *
 * Unlike `payables-columns.tsx`'s row menu (one dialog, one piece of page
 * state, a callback threaded through a column-builder function), this column
 * has to live in a plain exported array — `RECOVERY_COLUMNS` is picked with a
 * bare ternary alongside the static `RECEIVABLE_COLUMNS` — so there is no
 * per-row callback to thread. A dialog owned by the cell that opened it needs
 * none: `AttachBankDialog`'s own `onSuccess` invalidates `ledgerKeys.root()`,
 * which is what `useReceivables` is keyed on, so the row's `financingBank`
 * arrives from the next refetch and this cell just re-renders in place — no
 * page-level state, no lost scroll position, no lost filters.
 */
function BankCell({ row }: { row: ReceivableRow }): JSX.Element {
  const [open, setOpen] = useState(false);

  if (row.financingBank) {
    return (
      <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {bankLabel(row.financingBank)}
      </Box>
    );
  }

  // propertyId is non-null for every wantsLoan row (RECEIVABLES_JOINS' LEFT
  // JOIN only misses when the project has no property at all, and wants_loan
  // itself lives on that same property row) — the `!propertyId` half of this
  // guard is a defensive fallback for a state the data cannot actually reach,
  // not a case this screen expects to render.
  const { propertyId } = row;
  if (!row.wantsLoan || !propertyId) {
    return <Empty />;
  }

  return (
    <>
      {/* Not muted text: a collector looking at this row has a problem —
          nobody to call — that they cannot fix from anywhere else on this
          screen. A dash here would hide the exact gap this column exists to
          surface. */}
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Add bank
      </Button>
      <AttachBankDialog
        open={open}
        onClose={() => setOpen(false)}
        propertyId={propertyId}
        customerName={row.customerName ?? row.projectName}
        projectNumber={row.projectNumber}
        outstandingPaise={row.balancePaise}
        currentValue={row.financingBank}
      />
    </>
  );
}

/**
 * `RECEIVABLE_COLUMNS` plus the two facts that only matter once you are
 * chasing a delivered-but-unpaid job: how long it has been since the meter
 * went live, and who the lender is. `finance-receivables-page.tsx` picks this
 * array whenever `scope !== 'all'` — Recovery — Cash rows run through it too,
 * where every `wantsLoan` is false and the Bank cell is always the plain dash.
 */
export const RECOVERY_COLUMNS: CrmColumn<ReceivableRow>[] = [
  ...RECEIVABLE_COLUMNS,
  {
    field: 'daysSinceMeter',
    header: 'Since meter',
    track: crm['col-recv-meter'],
    align: 'right',
    // Null, never 0 — a project commissioned months ago must never read as
    // "commissioned today". Null means the meter task predates activity
    // logging, not that zero days have passed.
    renderCell: (row) => (row.daysSinceMeter == null ? <Empty /> : `${row.daysSinceMeter}d`),
  },
  {
    field: 'financingBank',
    header: 'Bank',
    track: crm['col-recv-bank'],
    stopPropagation: true,
    renderCell: (row) => <BankCell row={row} />,
  },
];
