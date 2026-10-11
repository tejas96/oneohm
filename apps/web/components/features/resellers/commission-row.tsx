'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Checkbox, IconButton, Menu } from '@mui/material';
import { COMMISSION_STATE_LABEL } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import { type JSX, memo, useState } from 'react';

import { COMMISSION_STATE_TONE } from './commission-state';

import { ABOVE, BONE, CalmRow, SKELETON_CARD, stopRowClick } from '@/components/shared/calm-list';
import { CrmStatusPill } from '@/components/shared/crm-table';
import { GatedMenuItem } from '@/components/shared/guards';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { CommissionRow } from '@/lib/hooks/resources/resellers';
import { cn, formatBusinessDate } from '@/lib/utils';
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

/**
 * Wide: tick · deal · base × rate = amount · state · ⋮ on one line; the deal
 * track never drops below the width of a quote number with its won date. Narrow
 * (the list itself under 960px): the deal and ⋮, then the sum, then the state.
 */
const ROW_GRID =
  'grid grid-cols-[28px_minmax(0,1fr)_34px] items-center gap-x-3 gap-y-2.5 @[960px]:grid-cols-[28px_minmax(304px,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_34px] @[960px]:gap-4';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
const CELL = {
  tick: `col-start-1 row-start-1 ${WIDE}`,
  deal: `col-start-2 row-start-1 ${WIDE}`,
  maths: `col-span-2 col-start-2 row-start-2 ${WIDE}`,
  state: `col-span-2 col-start-2 row-start-3 ${WIDE}`,
  actions: `col-start-3 row-start-1 ${WIDE}`,
} as const;

const NOTE = 'block text-[12px] text-foreground-tertiary';

export interface CommissionRowProps {
  row: CommissionRow;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  ticked: boolean;
  onTick: (row: CommissionRow, ticked: boolean) => void;
  onAction: (a: CommissionAction, r: CommissionRow) => void;
}

/**
 * One commission, one line: whose deal, the sum that makes the amount, where
 * it stands, and what can be done with it. It is only read and ticked — the
 * row opens nothing; its actions are in the ⋮ menu.
 */
function CommissionRowInner({
  row: r,
  index,
  entering,
  ticked,
  onTick,
  onAction,
}: CommissionRowProps): JSX.Element {
  return (
    <CalmRow rowId={r.id} className={ROW_GRID} index={index} entering={entering} selected={ticked}>
      {/* Tick */}
      <div className={cn(CELL.tick, ABOVE, '-ml-2')}>
        <Checkbox
          size="small"
          checked={ticked}
          onChange={(event) => onTick(r, event.target.checked)}
          slotProps={{ input: { 'aria-label': `Select the commission on ${r.quoteNumber}` } }}
        />
      </div>

      {/* Deal */}
      <div className={cn(CELL.deal, ABOVE, 'min-w-0')}>
        <span
          title={r.customerName}
          className="block truncate text-[15px] font-semibold tracking-[-0.01em]"
        >
          {r.customerName}
        </span>
        {/* Wraps on a phone: the won date is never cut off. */}
        <span className="block text-[13px] tabular-nums text-foreground-secondary">
          {r.quoteNumber}
          {r.acceptedAt ? ` · won ${formatBusinessDate(r.acceptedAt)}` : ''}
        </span>
      </div>

      {/* Base × rate = amount */}
      <div className={cn(CELL.maths, ABOVE, 'min-w-0')}>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] tabular-nums">
          <span className="whitespace-nowrap">
            {formatPaise(r.basePaise)} × {r.ratePercent}% ={' '}
            <strong>{formatPaise(r.amountPaise)}</strong>
          </span>
          {(r.baseSource === 'manual' || r.rateSource === 'manual') && (
            <CrmStatusPill tone="neutral" label="edited" />
          )}
          {(r.baseSource === 'missing' || r.rateSource === 'missing') && (
            <CrmStatusPill
              tone="warning"
              label={r.baseSource === 'missing' ? 'base missing' : 'rate missing'}
            />
          )}
        </span>
        <span className={NOTE}>Base × rate = amount</span>
      </div>

      {/* State, and the one line that explains it */}
      <div className={cn(CELL.state, ABOVE, 'min-w-0')}>
        <CrmStatusPill
          tone={COMMISSION_STATE_TONE[r.state]}
          label={COMMISSION_STATE_LABEL[r.state]}
        />
        {/* A reason can be long (a cancel note): it wraps, up to three lines. */}
        <span className={cn(NOTE, 'mt-0.5 line-clamp-3 [overflow-wrap:anywhere]')}>
          {r.state === 'paid' && r.paidAt
            ? `${formatBusinessDate(r.paidAt)} · ${r.paymentReference ?? ''}`
            : null}
          {r.state === 'payment_in_review' ? r.payoutRequestNo : null}
          {r.state === 'cancelled' ? r.cancelReason : null}
          {r.state === 'recovered' ? r.recoveryNotes : null}
          {r.state === 'approved' && r.payoutRejectedReason ? r.payoutRejectedReason : null}
        </span>
      </div>

      {/* ⋮ */}
      <div className={cn(CELL.actions, ABOVE, 'flex justify-end')} onClick={stopRowClick}>
        <Actions row={r} onAction={onAction} />
      </div>
    </CalmRow>
  );
}

export const CommissionRowCard = memo(CommissionRowInner);

/** One placeholder shaped like a commission row, so nothing jumps when data lands. */
export function CommissionRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <span className={cn(CELL.tick, BONE, 'size-5')} />
      <div className={cn(CELL.deal, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-4/5')} />
      </div>
      <div className={cn(CELL.maths, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-4/5')} />
        <span className={cn(BONE, 'h-3 w-1/3')} />
      </div>
      <div className={cn(CELL.state, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-5 w-20')} />
      </div>
      <div className={cn(CELL.actions, 'flex justify-end')}>
        <span className={cn(BONE, 'size-[34px]')} />
      </div>
    </div>
  );
}
