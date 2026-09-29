'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, IconButton, Menu } from '@mui/material';
import { COMMISSION_STATE_LABEL } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import { type JSX, useState } from 'react';

import { COMMISSION_STATE_TONE } from './commission-state';

import { CrmStatusPill, type CrmColumn } from '@/components/shared/crm-table';
import { GatedMenuItem } from '@/components/shared/guards';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { CommissionRow } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

export type CommissionAction = 'approve' | 'edit' | 'cancel' | 'pay' | 'recover';

/** Spec §10.2: at most four items, by state. Always visible. */
function Actions({
  row,
  onAction,
}: {
  row: CommissionRow;
  onAction: (a: CommissionAction, r: CommissionRow) => void;
}): JSX.Element | null {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const act = (a: CommissionAction) => () => {
    setAnchor(null);
    onAction(a, row);
  };
  const go = (href: string) => () => {
    setAnchor(null);
    router.push(href);
  };

  const items: JSX.Element[] = [];
  const g = (key: string, label: string, onClick: () => void): JSX.Element => (
    <GatedMenuItem
      key={key}
      permission="finance.payments.record"
      subject={label}
      onAction={onClick}
    >
      {label}
    </GatedMenuItem>
  );
  if (row.state === 'pending') {
    items.push(
      g('a', 'Approve', act('approve')),
      g('e', 'Edit', act('edit')),
      g('c', 'Cancel', act('cancel')),
    );
  }
  if (row.state === 'needs_amount' || row.state === 'on_hold') {
    items.push(g('e', 'Edit', act('edit')), g('c', 'Cancel', act('cancel')));
  }
  if (row.state === 'waiting_for_project') {
    items.push(g('e', 'Edit', act('edit')), g('c', 'Cancel', act('cancel')));
  }
  if (row.state === 'approved') {
    items.push(
      g('p', 'Record payment', act('pay')),
      g('e', 'Edit', act('edit')),
      g('c', 'Cancel', act('cancel')),
    );
  }
  if (row.state === 'payment_in_review') {
    items.push(
      <GatedMenuItem
        key="q"
        permission="finance.approvals.view"
        subject="Payment Approvals"
        onAction={go(
          row.payoutRequestId
            ? `${ROUTES.FINANCE.APPROVALS}?open=${encodeURIComponent(row.payoutRequestId)}`
            : ROUTES.FINANCE.APPROVALS,
        )}
      >
        Open in Payment Approvals
      </GatedMenuItem>,
    );
  }
  if (row.state === 'to_recover') {
    items.push(g('r', 'Close recovery', act('recover')));
  }
  // The expense this payout posted sits on the project's Money tab.
  if (row.expenseEntryId && row.projectId) {
    items.push(
      <GatedMenuItem
        key="x"
        permission="finance.view"
        subject="Open expense"
        onAction={go(`${buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}?tab=finance`)}
      >
        Open expense
      </GatedMenuItem>,
    );
  }
  if (row.projectId) {
    items.push(
      <GatedMenuItem
        key="o"
        permission="projects.view"
        subject="Open project"
        onAction={go(buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId }))}
      >
        Open project
      </GatedMenuItem>,
    );
  }
  if (items.length === 0) return null;

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${row.quoteNumber}`}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {items.slice(0, 4)}
      </Menu>
    </>
  );
}

export function buildCommissionColumns(
  onAction: (a: CommissionAction, r: CommissionRow) => void,
): CrmColumn<CommissionRow>[] {
  return [
    {
      field: 'deal',
      header: 'Deal',
      track: crm['col-customer'],
      renderCell: (r) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{r.customerName}</Box>
          <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {r.quoteNumber}
            {r.acceptedAt ? ` · won ${formatBusinessDate(r.acceptedAt)}` : ''}
          </Box>
        </Box>
      ),
    },
    {
      field: 'maths',
      header: 'Base × rate = amount',
      track: crm['col-reseller-maths'],
      renderCell: (r) => (
        <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatPaise(r.basePaise)} × {r.ratePercent}% ={' '}
          <strong>{formatPaise(r.amountPaise)}</strong>
          {(r.baseSource === 'manual' || r.rateSource === 'manual') && (
            <CrmStatusPill tone="neutral" label="edited" />
          )}
          {(r.baseSource === 'missing' || r.rateSource === 'missing') && (
            <CrmStatusPill
              tone="warning"
              label={r.baseSource === 'missing' ? 'base missing' : 'rate missing'}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'state',
      header: 'State',
      track: crm['col-reseller-state'],
      renderCell: (r) => (
        <Box>
          <CrmStatusPill
            tone={COMMISSION_STATE_TONE[r.state]}
            label={COMMISSION_STATE_LABEL[r.state]}
          />
          <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {r.state === 'paid' && r.paidAt
              ? `${formatBusinessDate(r.paidAt)} · ${r.paymentReference ?? ''}`
              : null}
            {r.state === 'payment_in_review' ? r.payoutRequestNo : null}
            {r.state === 'cancelled' ? r.cancelReason : null}
            {r.state === 'recovered' ? r.recoveryNotes : null}
            {r.state === 'approved' && r.payoutRejectedReason ? r.payoutRejectedReason : null}
          </Box>
        </Box>
      ),
    },
    {
      field: 'actions',
      header: '',
      track: crm['col-actions'],
      align: 'right',
      stopPropagation: true,
      renderCell: (r) => <Actions row={r} onAction={onAction} />,
    },
  ];
}
