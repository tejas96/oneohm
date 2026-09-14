'use client';

import { Box, Button } from '@mui/material';
import { bankLabel } from '@tejas96/shared/constants';
import NextLink from 'next/link';
import { useState, type JSX } from 'react';

import { AttachBankDialog } from './attach-bank-dialog';

import { CrmStatusPill, type CrmColumn, type CrmTone } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { Receivable, RecoveryRow } from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

export type ReceivableRow = Receivable & Record<string, unknown>;
export type RecoveryTableRow = RecoveryRow & Record<string, unknown>;

/**
 * Ageing bucket for a row.
 *
 * Colour is never the only signal — the label carries it too, so the list is
 * still readable to someone who cannot distinguish the tones.
 */
export function ageingBucket(days: number): { label: string; tone: CrmTone } {
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
      // Straight to the Finance tab: everyone arriving from a receivable is
      // there to record a payment or fix who pays a milestone, and the project
      // Overview made that an extra click every time.
      <NextLink
        href={`${buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}?tab=finance`}
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
      <Box sx={{ fontWeight: 700, color: color.danger }}>{formatPaise(row.balancePaise)}</Box>
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
 * lives in a plain exported array, so there is no per-row callback to thread. A
 * dialog owned by the cell that opened it needs none: `AttachBankDialog`'s own
 * `onSuccess` invalidates `ledgerKeys.root()`, which is what `useRecovery` is
 * keyed on, so the row's `financingBank` arrives from the next refetch and this
 * cell re-renders in place — no lost scroll position, no lost filters.
 */
function BankCell({ row }: { row: RecoveryTableRow }): JSX.Element {
  const [open, setOpen] = useState(false);

  // A loan job with no lender milestone: the customer is being chased for the
  // bank's share. The banner above the list counts these; this says which.
  const noBankShare =
    row.wantsLoan && !row.hasLenderMilestone ? (
      <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
        Bank share not split out
      </Box>
    ) : null;

  if (row.financingBank) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bankLabel(row.financingBank)}
        </Box>
        {noBankShare}
      </Box>
    );
  }

  // propertyId is non-null for every wantsLoan row (wants_loan lives on the
  // property row the query joins), so `!propertyId` is a defensive fallback.
  const { propertyId } = row;
  if (!row.wantsLoan || !propertyId) {
    return <Empty />;
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      {/* Not muted text: a collector looking at this row has a problem —
          nobody to call — that they cannot fix from anywhere else on this
          screen. A dash here would hide the exact gap this column exists to
          surface. */}
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Add bank
      </Button>
      {noBankShare}
      <AttachBankDialog
        open={open}
        onClose={() => setOpen(false)}
        propertyId={propertyId}
        customerName={row.customerName ?? row.projectName}
        projectNumber={row.projectNumber}
        outstandingPaise={row.outstandingPaise}
        currentValue={row.financingBank}
      />
    </Box>
  );
}

/**
 * Recovery, one row per project — the call list. Expanding a row lists its
 * open milestones (`RecoveryMilestones`), which add up to "Still owed".
 *
 * Each sortable `field` is the API's own `sortBy` key, so a header can never
 * ask for an ordering the server does not have.
 */
export const RECOVERY_PROJECT_COLUMNS: CrmColumn<RecoveryTableRow>[] = [
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
      <Box sx={{ minWidth: 0 }}>
        <NextLink
          href={`${buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}?tab=finance`}
          style={{ color: color.accent, textDecoration: 'none', fontWeight: 500 }}
        >
          {row.projectNumber}
        </NextLink>
        <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
          {row.openMilestones} open {row.openMilestones === 1 ? 'milestone' : 'milestones'}
        </Box>
      </Box>
    ),
  },
  {
    field: 'outstanding',
    header: 'Still owed',
    track: crm['col-recv-outstanding'],
    sortable: true,
    align: 'right',
    cellSx: { pr: 1.5 },
    renderCell: (row) => (
      <Box sx={{ textAlign: 'right' }}>
        <Box sx={{ fontWeight: 700, color: color.danger }}>{formatPaise(row.outstandingPaise)}</Box>
        {/* Only when it differs: "₹X overdue" under an equal ₹X says nothing. */}
        {row.overduePaise > 0 && row.overduePaise < row.outstandingPaise ? (
          <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
            {formatPaise(row.overduePaise)} overdue
          </Box>
        ) : null}
      </Box>
    ),
  },
  {
    field: 'worstDaysOverdue',
    header: 'Oldest overdue',
    track: crm['col-recv-ageing'],
    sortable: true,
    renderCell: (row) => {
      const { label, tone } = ageingBucket(row.worstDaysOverdue);
      return <CrmStatusPill label={label} tone={tone} size="sm" />;
    },
  },
  {
    field: 'daysSinceMeter',
    header: 'Since meter',
    track: crm['col-recv-meter'],
    sortable: true,
    align: 'right',
    // Right-aligned against the Bank column: without the gap "66d" runs into its dash.
    cellSx: { pr: 1.5 },
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
