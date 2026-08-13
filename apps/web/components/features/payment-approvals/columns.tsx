'use client';

import { Button } from '@mui/material';

import type { ColumnConfig } from '@/components/shared/advanced-table';
import { MUIStatusChip, type StatusChipColor } from '@/components/ui';
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

export function approvalColumns(
  onReview: (row: ApprovalRow) => void,
): ColumnConfig<ApprovalRow>[] {
  return [
    {
      field: 'requestNo',
      headerName: 'Request #',
      searchable: true,
      width: 170,
    },
    {
      field: 'valueDate',
      headerName: 'Payment date',
      type: 'date',
      filterable: true,
      filterType: 'date',
      width: 130,
    },
    {
      field: 'kind',
      headerName: 'Type',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Receipt', value: 'receipt' },
        { label: 'Expense', value: 'expense' },
        { label: 'Reversal', value: 'reversal' },
      ],
      width: 110,
      renderCell: ({ row }) => KIND_LABEL[row.kind],
    },
    {
      field: 'amountPaise',
      headerName: 'Amount',
      type: 'number',
      width: 140,
      // Always shown as a magnitude; the Type column already says which way the
      // money moves, and a bare minus sign next to "Expense" reads as an error.
      renderCell: ({ row }) => formatPaise(Math.abs(row.amountPaise)),
    },
    {
      field: 'reference',
      headerName: 'Reference',
      searchable: true,
      renderCell: ({ row }) => row.reference ?? row.counterparty ?? '—',
    },
    {
      field: 'submittedAt',
      headerName: 'Waiting',
      width: 110,
      renderCell: ({ row }) => (row.status === 'pending' ? ageLabel(row.submittedAt) : '—'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={row.status}
          color={STATUS_COLOR[row.status]}
          colorSeed={row.status}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      sortable: false,
      width: 100,
      actions: (row) => (
        <Button size="small" onClick={() => onReview(row)}>
          Review
        </Button>
      ),
    },
  ];
}
