'use client';

import { Box } from '@mui/material';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { CrmStatusPill, type CrmColumn, type CrmTone } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { PaymentApproval } from '@/lib/hooks/resources/payment-approvals';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

export type ApprovalRow = PaymentApproval & Record<string, unknown>;

const STATUS_TONE: Record<PaymentApproval['status'], CrmTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const KIND_TONE: Record<PaymentApproval['kind'], CrmTone> = {
  receipt: 'success',
  expense: 'info',
  reversal: 'warning',
};

const KIND_LABEL: Record<PaymentApproval['kind'], string> = {
  receipt: 'Receipt',
  expense: 'Expense',
  reversal: 'Reversal',
};

/**
 * How long a request has been waiting. Only meaningful while pending — once
 * decided, the age of a queue entry tells the reader nothing.
 */
function ageLabel(submittedAt: string): string {
  const hours = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** A muted dash, so an empty cell reads as "nothing" rather than as broken. */
function Empty(): JSX.Element {
  return <Box sx={{ color: color['text-tertiary'] }}>—</Box>;
}

/**
 * `sortable` is set only on the four fields the API whitelists, so a header can
 * never ask for an ordering the server will silently ignore.
 */
export const APPROVAL_COLUMNS: CrmColumn<ApprovalRow>[] = [
  {
    field: 'requestNo',
    header: 'Request #',
    track: crm['col-approval-request'],
    renderCell: (row) => (
      <Box sx={{ fontWeight: 600, fontSize: crm['text-row-title'] }}>{row.requestNo}</Box>
    ),
  },
  {
    field: 'valueDate',
    header: 'Paid on',
    track: crm['col-approval-date'],
    sortable: true,
    renderCell: (row) => row.valueDate,
  },
  {
    field: 'kind',
    header: 'Type',
    track: crm['col-approval-type'],
    renderCell: (row) => (
      <CrmStatusPill label={KIND_LABEL[row.kind]} tone={KIND_TONE[row.kind]} dot={false} size="sm" />
    ),
  },
  {
    field: 'projectNumber',
    header: 'Project',
    track: crm['col-approval-project'],
    // Carries its own link, so a click here must not also open the review panel.
    stopPropagation: true,
    renderCell: (row) => (
      <NextLink
        href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
        style={{ color: color.accent, textDecoration: 'none', fontWeight: 500 }}
      >
        {row.projectNumber ?? 'View project'}
      </NextLink>
    ),
  },
  {
    field: 'customerName',
    header: 'Customer',
    track: crm['col-approval-customer'],
    sortable: true,
    renderCell: (row) =>
      row.customerName ? (
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontWeight: 500,
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
    field: 'amountPaise',
    header: 'Amount',
    track: crm['col-approval-amount'],
    sortable: true,
    align: 'right',
    // The next column butts straight up against a right-aligned number.
    cellSx: { pr: 1.5 },
    // Magnitude only: the Type column already says which way the money moves,
    // and a minus sign beside "Expense" reads as an error.
    renderCell: (row) => (
      <Box sx={{ fontWeight: 600 }}>{formatPaise(Math.abs(row.amountPaise))}</Box>
    ),
  },
  {
    field: 'reference',
    header: 'Reference',
    track: crm['col-approval-reference'],
    // Hidden by default: a UTR is a verification detail the review panel shows
    // in full, and at a glance the approver needs who/what/how much. Still
    // searchable, and revealable from the column menu.
    defaultHidden: true,
    renderCell: (row) => row.reference ?? row.counterparty ?? <Empty />,
  },
  {
    field: 'submittedByName',
    header: 'Submitted by',
    track: crm['col-approval-submitter'],
    defaultHidden: true,
    renderCell: (row) => row.submittedByName ?? <Empty />,
  },
  {
    field: 'submittedAt',
    header: 'Waiting',
    track: crm['col-approval-waiting'],
    sortable: true,
    renderCell: (row) => (row.status === 'pending' ? ageLabel(row.submittedAt) : <Empty />),
  },
  {
    field: 'status',
    header: 'Status',
    track: crm['col-approval-status'],
    renderCell: (row) => (
      <CrmStatusPill label={row.status} tone={STATUS_TONE[row.status]} size="sm" />
    ),
  },
];
