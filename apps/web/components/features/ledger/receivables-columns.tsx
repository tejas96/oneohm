'use client';

import { Box } from '@mui/material';
import NextLink from 'next/link';
import type { JSX } from 'react';

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
export function ageingBucket(days: number): { label: string; tone: CrmTone } {
  if (days <= 0) return { label: 'Current', tone: 'neutral' };
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
    renderCell: (row) => formatPaise(row.expectedAmount * 100),
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
    renderCell: (row) => formatPaise(row.paidAmount * 100),
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
        {formatPaise(row.outstandingAmount * 100)}
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
