'use client';

import { Box } from '@mui/material';
import NextLink from 'next/link';

import { formatExpenseCategory } from './format-expense-category';

import { CrmStatusPill, type CrmColumn } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { LedgerEntry } from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

export type CashRow = LedgerEntry & Record<string, unknown>;

export const CASH_COLUMNS: CrmColumn<CashRow>[] = [
  {
    field: 'valueDate',
    header: 'Date',
    track: crm['col-cash-date'],
    sortable: true,
    renderCell: (row) => (
      <Box>
        <Box>{formatBusinessDate(row.valueDate)}</Box>
        {/* Flagged because a historical row's real value date is unrecoverable,
            and treating a guess as fact is how ageing quietly goes wrong. */}
        {row.valueDateIsInferred ? (
          <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>approx.</Box>
        ) : null}
      </Box>
    ),
  },
  {
    field: 'entryNo',
    header: 'Entry',
    track: crm['col-cash-entry'],
    renderCell: (row) => (
      <Box sx={{ fontWeight: 600, fontSize: crm['text-row-title'] }}>{row.entryNo}</Box>
    ),
  },
  {
    field: 'customerName',
    header: 'Customer',
    track: crm['col-cash-customer'],
    sortable: true,
    stopPropagation: true,
    renderCell: (row) => (
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.customerName ?? '—'}
        </Box>
        {row.projectId ? (
          <NextLink
            href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
            style={{
              color: color.accent,
              textDecoration: 'none',
              fontSize: crm['text-row-xs'],
            }}
          >
            {row.projectNumber ?? 'View project'}
          </NextLink>
        ) : null}
      </Box>
    ),
  },
  {
    field: 'detail',
    header: 'Detail',
    track: crm['col-cash-detail'],
    renderCell: (row) => {
      // A reversal is a correction, not a payment — labelling it as one is how
      // a bounced cheque reads as money received.
      if (row.reversesId) {
        return (
          <Box sx={{ color: color['text-secondary'] }}>
            Reversal — {row.reversalReason ?? 'no reason given'}
          </Box>
        );
      }
      // A vendor payment settles a bill recorded earlier. Two rows for one
      // cost is correct — the credit bill and the payment that settles it —
      // but only reads correctly if this one says whose bill it paid.
      if (row.entryType === 'vendor_payment') {
        return (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Paid {row.vendorName ?? 'vendor'}
            </Box>
            {row.recordedByName || row.approvedByName ? (
              <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
                {row.recordedByName ? `by ${row.recordedByName}` : null}
                {row.recordedByName && row.approvedByName ? ' · ' : null}
                {row.approvedByName ? `approved ${row.approvedByName}` : null}
              </Box>
            ) : null}
          </Box>
        );
      }
      // A bill taken on credit: the cost was taken on when it was recorded, not
      // paid then. "On credit" rather than "Unpaid" — an entry is a permanent
      // fact and cannot change once written, so a status label on it would
      // stay "Unpaid" long after the vendor is paid. Whether a vendor is still
      // owed is answered by their balance on Payables, not by this row.
      // Neutral tone for the same reason: it is a description, not a warning.
      if (row.isCash === false) {
        return (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <CrmStatusPill label="On credit" tone="neutral" dot={false} size="sm" />
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.vendorName ?? 'Vendor'}
              </Box>
            </Box>
            {row.recordedByName || row.approvedByName ? (
              <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
                {row.recordedByName ? `by ${row.recordedByName}` : null}
                {row.recordedByName && row.approvedByName ? ' · ' : null}
                {row.approvedByName ? `approved ${row.approvedByName}` : null}
              </Box>
            ) : null}
          </Box>
        );
      }
      const parts = [
        row.category ? formatExpenseCategory(row.category) : (row.paymentMethod ?? row.entryType),
        row.counterparty,
        row.reference,
      ].filter(Boolean);
      return (
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {parts.join(' · ')}
          </Box>
          {row.recordedByName || row.approvedByName ? (
            <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
              {row.recordedByName ? `by ${row.recordedByName}` : null}
              {row.recordedByName && row.approvedByName ? ' · ' : null}
              {row.approvedByName ? `approved ${row.approvedByName}` : null}
            </Box>
          ) : null}
        </Box>
      );
    },
  },
  {
    field: 'direction',
    header: 'Flow',
    track: crm['col-status'],
    // A reversal keeps its target's `direction` and flips the sign, so a
    // corrected receipt would otherwise render as "In" beside a negative
    // amount. Naming it a reversal is clearer than being technically correct.
    renderCell: (row) =>
      row.reversesId ? (
        <CrmStatusPill label="Reversal" tone="warning" dot={false} size="sm" />
      ) : (
        <CrmStatusPill
          label={row.direction === 'in' ? 'In' : 'Out'}
          tone={row.direction === 'in' ? 'success' : 'info'}
          dot={false}
          size="sm"
        />
      ),
  },
  {
    field: 'amountPaise',
    header: 'Amount',
    track: crm['col-cash-amount'],
    sortable: true,
    align: 'right',
    cellSx: { pr: 1.5 },
    // Signed here, unlike the approvals queue: this IS the cash position, so a
    // negative row must read as money leaving.
    renderCell: (row) => (
      <Box
        sx={{
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          // A reversal is a correction, not cash moving: grey and signed, so
          // undoing a bill on credit never reads as money coming in.
          color: row.reversesId
            ? color['text-secondary']
            : row.amountPaise < 0
              ? color.danger
              : color.success,
        }}
      >
        {row.reversesId && row.amountPaise > 0 ? '+' : ''}
        {formatPaise(row.amountPaise)}
      </Box>
    ),
  },
];
