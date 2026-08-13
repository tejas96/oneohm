'use client';

import NextLink from 'next/link';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { MUIStatusChip, type StatusChipColor } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { PaymentApproval } from '@/lib/hooks/resources/payment-approvals';
import { formatPaise } from '@/lib/utils/paise';

// AdvancedTable requires TRow extends Record<string, unknown>. PaymentApproval
// has explicit typed fields, so it is widened here for table usage only.
export type ApprovalRow = PaymentApproval & Record<string, unknown>;

const STATUS_COLOR: Record<PaymentApproval['status'], StatusChipColor> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

const KIND_LABEL: Record<PaymentApproval['kind'], string> = {
  receipt: 'Receipt',
  expense: 'Expense',
  reversal: 'Reversal',
};

/**
 * How long a request has been waiting. Shown only while pending — once decided,
 * the age of the queue entry tells the reader nothing.
 */
function ageLabel(submittedAt: string): string {
  const hours = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Every column is `sortable: false` on purpose: the queue is ordered oldest
 * pending first by the API, which exposes no sort key, and a header that
 * silently does nothing is worse than one that is plainly not clickable.
 *
 * There is no Review column — the whole row opens the review panel. A trailing
 * button was the widest column and the first thing a narrow window pushed out
 * of sight, which made the primary action unreachable.
 */
export function approvalColumns(): ColumnConfig<ApprovalRow>[] {
  return [
    {
      field: 'requestNo',
      headerName: 'Request #',
      sortable: false,
      searchable: true,
      width: 130,
    },
    {
      field: 'valueDate',
      headerName: 'Paid on',
      type: 'date',
      sortable: false,
      filterable: true,
      filterType: 'date',
      width: 105,
    },
    {
      field: 'kind',
      headerName: 'Type',
      sortable: false,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Receipt', value: 'receipt' },
        { label: 'Expense', value: 'expense' },
        { label: 'Reversal', value: 'reversal' },
      ],
      width: 95,
      renderCell: ({ row }) => KIND_LABEL[row.kind],
    },
    {
      // Without these two an approver cannot tell whose money a row is, which
      // makes the queue impossible to check against a bank statement.
      field: 'projectNumber',
      headerName: 'Project',
      sortable: false,
      searchable: true,
      width: 140,
      renderCell: ({ row }) => (
        <NextLink
          href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
          onClick={(e) => e.stopPropagation()}
          style={{ color: 'var(--ds-accent, #1976d2)', textDecoration: 'none' }}
        >
          {row.projectNumber ?? 'View project'}
        </NextLink>
      ),
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      sortable: false,
      searchable: true,
      width: 135,
      renderCell: ({ row }) => row.customerName ?? '—',
    },
    {
      field: 'amountPaise',
      headerName: 'Amount',
      type: 'number',
      sortable: false,
      width: 110,
      // Always shown as a magnitude; the Type column already says which way the
      // money moves, and a bare minus sign next to "Expense" reads as an error.
      renderCell: ({ row }) => formatPaise(Math.abs(row.amountPaise)),
    },
    {
      field: 'reference',
      headerName: 'Reference',
      sortable: false,
      searchable: true,
      flex: 1,
      renderCell: ({ row }) => row.reference ?? row.counterparty ?? '—',
    },
    {
      field: 'submittedByName',
      headerName: 'Submitted by',
      sortable: false,
      width: 125,
      defaultHidden: true,
      renderCell: ({ row }) => row.submittedByName ?? '—',
    },
    {
      field: 'submittedAt',
      headerName: 'Waiting',
      sortable: false,
      width: 90,
      renderCell: ({ row }) => (row.status === 'pending' ? ageLabel(row.submittedAt) : '—'),
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: false,
      width: 105,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={row.status}
          color={STATUS_COLOR[row.status]}
          colorSeed={row.status}
          size="small"
        />
      ),
    },
  ];
}
