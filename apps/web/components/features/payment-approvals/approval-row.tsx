'use client';

import { Checkbox } from '@mui/material';
import NextLink from 'next/link';
import { type JSX, memo } from 'react';

import { ABOVE, BONE, CalmRow, SKELETON_CARD, stopRowClick } from '@/components/shared/calm-list';
import { CrmStatusPill, type CrmTone } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { PaymentApproval } from '@/lib/hooks/resources/payment-approvals';
import { color } from '@/lib/theme/tokens';
import { cn, formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

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
  vendor_payment: 'info',
  commission: 'info',
};

const KIND_LABEL: Record<PaymentApproval['kind'], string> = {
  receipt: 'Receipt',
  expense: 'Expense',
  reversal: 'Reversal',
  vendor_payment: 'Vendor payment',
  commission: 'Commission',
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
  return <span className="block text-[14px] text-foreground-tertiary">—</span>;
}

/**
 * Wide: tick · request and date · type and project · customer · amount ·
 * recorded by · status and waiting on one line. The type track never drops
 * below the width of a whole project number, and the amount track holds a
 * crore: neither is ever cut short. Narrow (the list itself under 960px):
 * request beside the amount, then type and project, then the customer beside
 * the status, then who recorded it. Phone (under 460px): a request number and
 * a large amount do not fit side by side, so the amount goes under it.
 *
 * Two grids, because only the pending tab has tick boxes: a tab without them
 * has no empty track where the box would be.
 */
const WIDE = '@[960px]:col-auto @[960px]:row-auto';

// Written out in full: Tailwind only sees class names that appear whole in the source.
const TICK_GRID =
  'grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 @[960px]:grid-cols-[28px_156px_minmax(204px,1fr)_minmax(0,1.1fr)_140px_minmax(0,1fr)_92px] @[960px]:gap-4';
const TICK_CELL = {
  tick: `col-start-1 row-start-1 ${WIDE}`,
  request: `col-span-2 col-start-2 row-start-1 @[460px]:col-span-1 ${WIDE}`,
  amount: `col-span-2 col-start-2 row-start-2 @[460px]:col-span-1 @[460px]:col-start-3 @[460px]:row-start-1 @[460px]:text-right ${WIDE}`,
  type: `col-span-2 col-start-2 row-start-3 @[460px]:row-start-2 ${WIDE}`,
  customer: `col-start-2 row-start-4 @[460px]:row-start-3 ${WIDE}`,
  status: `col-start-3 row-start-4 @[460px]:row-start-3 ${WIDE}`,
  recordedBy: `col-span-2 col-start-2 row-start-5 @[460px]:row-start-4 ${WIDE}`,
} as const;

const PLAIN_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 @[960px]:grid-cols-[156px_minmax(204px,1fr)_minmax(0,1.1fr)_140px_minmax(0,1fr)_92px] @[960px]:gap-4';
const PLAIN_CELL = {
  tick: 'hidden',
  request: `col-span-2 col-start-1 row-start-1 @[460px]:col-span-1 ${WIDE}`,
  amount: `col-span-2 col-start-1 row-start-2 @[460px]:col-span-1 @[460px]:col-start-2 @[460px]:row-start-1 @[460px]:text-right ${WIDE}`,
  type: `col-span-2 col-start-1 row-start-3 @[460px]:row-start-2 ${WIDE}`,
  customer: `col-start-1 row-start-4 @[460px]:row-start-3 ${WIDE}`,
  status: `col-start-2 row-start-4 @[460px]:row-start-3 ${WIDE}`,
  recordedBy: `col-span-2 col-start-1 row-start-5 @[460px]:row-start-4 ${WIDE}`,
} as const;

/** A cell is two lines on one rhythm: a fact over a note. */
const FACT = 'block truncate text-[14px] text-foreground';
const NOTE = 'block truncate text-[12px] text-foreground-tertiary';

export interface ApprovalRowProps {
  row: PaymentApproval;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  /** The row can be ticked for a bulk approve (the pending tab only). */
  tickable: boolean;
  ticked: boolean;
  onTick: (row: PaymentApproval, ticked: boolean) => void;
  /** Its review panel is open. */
  reviewing: boolean;
  onReview: (row: PaymentApproval) => void;
}

/**
 * One request, one line: which request and its date, what kind of money on
 * which project, whose, how much, who recorded it, and where it stands. The
 * row opens the review panel.
 */
function ApprovalRowInner({
  row,
  index,
  entering,
  tickable,
  ticked,
  onTick,
  reviewing,
  onReview,
}: ApprovalRowProps): JSX.Element {
  const CELL = tickable ? TICK_CELL : PLAIN_CELL;
  // A commission's counterparty already shows beside its Type.
  const reference = row.reference ?? (row.kind === 'commission' ? null : row.counterparty);

  return (
    <CalmRow
      rowId={row.id}
      className={tickable ? TICK_GRID : PLAIN_GRID}
      label={`Review request ${row.requestNo}`}
      onOpen={() => onReview(row)}
      index={index}
      entering={entering}
      selected={ticked || reviewing}
    >
      {/* Tick */}
      {tickable ? (
        <div className={cn(CELL.tick, ABOVE, '-ml-2')} onClick={stopRowClick}>
          <Checkbox
            size="small"
            checked={ticked}
            onChange={(event) => onTick(row, event.target.checked)}
            slotProps={{ input: { 'aria-label': `Select request ${row.requestNo}` } }}
          />
        </div>
      ) : null}

      {/* Request and date */}
      <div className={cn(CELL.request, ABOVE, 'min-w-0')}>
        <span className="block whitespace-nowrap text-[14px] font-semibold tabular-nums">
          {row.requestNo}
        </span>
        {/* Not "Paid on": the date also dates bills on credit and reversals.
            A reversal is dated the day it is approved, so until then it has none. */}
        <span className={cn(NOTE, 'tabular-nums')}>
          {row.kind === 'reversal' && row.status === 'pending'
            ? 'On approval'
            : formatBusinessDate(row.valueDate)}
        </span>
      </div>

      {/* Type and project. A commission names its reseller here (spec §8.3):
          the project and customer say whose roof, not who is being paid. */}
      <div className={cn(CELL.type, ABOVE, 'min-w-0')}>
        <div
          className="flex min-w-0 items-center gap-1.5"
          title={
            row.kind === 'commission' && row.counterparty
              ? `Commission · ${row.counterparty}`
              : undefined
          }
        >
          <span className="shrink-0">
            <CrmStatusPill
              label={KIND_LABEL[row.kind]}
              tone={KIND_TONE[row.kind]}
              dot={false}
              size="sm"
            />
          </span>
          {row.kind === 'commission' && row.counterparty ? (
            <span className="truncate text-[12px] text-foreground-tertiary">
              {row.counterparty}
            </span>
          ) : null}
        </div>
        {/* Carries its own link, so a click here must not also open the review panel. */}
        <NextLink
          href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
          prefetch={false}
          onClick={stopRowClick}
          className="mt-0.5 block truncate text-[13px] font-medium tabular-nums no-underline hover:underline"
          style={{ color: color.accent }}
        >
          {row.projectNumber ?? 'View project'}
        </NextLink>
      </div>

      {/* Customer */}
      <div className={cn(CELL.customer, ABOVE, 'min-w-0')}>
        {row.customerName ? (
          <>
            <span
              title={row.customerName}
              className="block truncate text-[15px] font-semibold tracking-[-0.01em]"
            >
              {row.customerName}
            </span>
            {row.customerPhone ? (
              <span className="block truncate text-[13px] tabular-nums text-foreground-secondary">
                {row.customerPhone}
              </span>
            ) : null}
          </>
        ) : (
          <Empty />
        )}
      </div>

      {/* Amount — magnitude only: the Type already says which way the money
          moves, and a minus sign beside "Expense" reads as an error. Under it
          the reference: the table kept it as a hidden column; a card has no
          column menu, so it is always here when there is one. */}
      <div className={cn(CELL.amount, ABOVE, 'min-w-0')}>
        <span className="block whitespace-nowrap text-[16px] font-semibold tabular-nums">
          {formatPaise(Math.abs(row.amountPaise))}
        </span>
        {reference ? (
          <span className={NOTE} title={`Reference: ${reference}`}>
            {reference}
          </span>
        ) : null}
      </div>

      {/* Recorded by. The role reads as the person's capacity — most senior
          first, exactly as the API orders it. Never split, truncated to one,
          or re-sorted here. Null (no role held) renders nothing, not an empty
          second line. */}
      <div className={cn(CELL.recordedBy, ABOVE, 'min-w-0')}>
        {row.submittedByName ? (
          <span className={FACT} title={`Recorded by ${row.submittedByName}`}>
            {row.submittedByName}
          </span>
        ) : (
          <Empty />
        )}
        {row.submittedByRoles ? (
          // Up to two lines, so the whole list of roles is read, not its first one.
          <span
            className="line-clamp-2 text-[12px] text-foreground-tertiary"
            title={row.submittedByRoles}
          >
            {row.submittedByRoles}
          </span>
        ) : null}
      </div>

      {/* Status, and how long it has waited while it is still pending. */}
      <div
        className={cn(
          CELL.status,
          ABOVE,
          'flex min-w-0 flex-col items-end gap-0.5 @[960px]:items-start',
        )}
      >
        <CrmStatusPill label={row.status} tone={STATUS_TONE[row.status]} size="sm" />
        {row.status === 'pending' ? (
          <span className="block whitespace-nowrap text-[12px] tabular-nums text-foreground-tertiary">
            <span>{ageLabel(row.submittedAt)}</span> <span>waiting</span>
          </span>
        ) : null}
      </div>
    </CalmRow>
  );
}

export const ApprovalRow = memo(ApprovalRowInner);

/** One placeholder shaped like a request row, so nothing jumps when data lands. */
export function ApprovalRowSkeleton({ tickable }: { tickable: boolean }): JSX.Element {
  const CELL = tickable ? TICK_CELL : PLAIN_CELL;
  return (
    <div className={cn(tickable ? TICK_GRID : PLAIN_GRID, SKELETON_CARD)}>
      {tickable ? <span className={cn(CELL.tick, BONE, 'size-5')} /> : null}
      <div className={cn(CELL.request, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-32')} />
        <span className={cn(BONE, 'h-3 w-20')} />
      </div>
      <div className={cn(CELL.type, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-5 w-20')} />
        <span className={cn(BONE, 'h-3 w-40')} />
      </div>
      <div className={cn(CELL.customer, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-2/5')} />
      </div>
      <div className={cn(CELL.amount, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-4 w-24')} />
      </div>
      <div className={cn(CELL.recordedBy, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-1/2')} />
        <span className={cn(BONE, 'h-3 w-3/4')} />
      </div>
      <div className={cn(CELL.status, 'flex flex-col items-end gap-2 @[960px]:items-start')}>
        <span className={cn(BONE, 'h-5 w-16')} />
      </div>
    </div>
  );
}
