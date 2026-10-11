'use client';

import NextLink from 'next/link';
import { type JSX, memo } from 'react';

import { formatExpenseCategory } from './format-expense-category';

import { ABOVE, BONE, CalmRow, SKELETON_CARD } from '@/components/shared/calm-list';
import { CrmStatusPill } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { LedgerEntry } from '@/lib/hooks/resources/ledger';
import { color } from '@/lib/theme/tokens';
import { cn, formatBusinessDate, formatPaymentMethod, toTitleLabel } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/**
 * Wide: date · customer and project · detail · entry and flow · amount on one
 * line. The amount track holds "-₹XX,XX,XX,XXX.XX" unclipped: an amount is
 * never cut short. Narrow (the list itself under 960px): customer beside the
 * amount, then the detail, then the date beside the entry and its flow.
 * Phone (under 460px): the project number needs the whole line — its last
 * digits tell two projects apart — so the customer gets one, and the amount
 * moves beside the detail.
 */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 @[960px]:grid-cols-[112px_minmax(0,1.2fr)_minmax(0,1.5fr)_164px_170px] @[960px]:gap-5';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
const CELL = {
  date: `col-start-1 row-start-3 ${WIDE}`,
  who: `col-span-2 col-start-1 row-start-1 @[460px]:col-span-1 ${WIDE}`,
  detail: `col-start-1 row-start-2 @[460px]:col-span-2 ${WIDE}`,
  entry: `col-start-2 row-start-3 ${WIDE}`,
  amount: `col-start-2 row-start-2 @[460px]:row-start-1 ${WIDE}`,
} as const;

/** A cell is two lines on one rhythm: a fact over a note. */
const FACT = 'block truncate text-[14px] text-foreground';
const NOTE = 'block truncate text-[12px] text-foreground-tertiary';

/** Who recorded the entry and who approved it, when either is known. */
function RecordedBy({ row }: { row: LedgerEntry }): JSX.Element | null {
  if (!row.recordedByName && !row.approvedByName) return null;
  return (
    <span className={NOTE}>
      {row.recordedByName ? `by ${row.recordedByName}` : null}
      {row.recordedByName && row.approvedByName ? ' · ' : null}
      {row.approvedByName ? `approved ${row.approvedByName}` : null}
    </span>
  );
}

/** What the entry was: a reversal, a vendor payment, a bill on credit, or a plain line. */
function Detail({ row }: { row: LedgerEntry }): JSX.Element {
  // A reversal is a correction, not a payment — labelling it as one is how
  // a bounced cheque reads as money received.
  if (row.reversesId) {
    const text = `Reversal — ${row.reversalReason ?? 'no reason given'}`;
    return (
      <span title={text} className="block truncate text-[14px] text-foreground-secondary">
        {text}
      </span>
    );
  }
  // A vendor payment settles a bill recorded earlier. Two rows for one
  // cost is correct — the credit bill and the payment that settles it —
  // but only reads correctly if this one says whose bill it paid.
  if (row.entryType === 'vendor_payment') {
    const text = `Paid ${row.vendorName ?? 'vendor'}`;
    return (
      <>
        <span title={text} className={FACT}>
          {text}
        </span>
        <RecordedBy row={row} />
      </>
    );
  }
  // A bill taken on credit. Its Flow says "On credit"; this says whose.
  if (row.isCash === false) {
    const text = `Bill from ${row.vendorName ?? 'a vendor'}`;
    return (
      <>
        <span title={text} className={FACT}>
          {text}
        </span>
        <RecordedBy row={row} />
      </>
    );
  }
  const text = [
    row.category
      ? formatExpenseCategory(row.category)
      : row.paymentMethod
        ? formatPaymentMethod(row.paymentMethod)
        : toTitleLabel(row.entryType),
    row.counterparty,
    row.reference,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <span title={text} className={FACT}>
        {text}
      </span>
      <RecordedBy row={row} />
    </>
  );
}

/** Whether cash came in, went out, or did not move. */
function Flow({ row }: { row: LedgerEntry }): JSX.Element {
  // A reversal keeps its target's `direction` and flips the sign, so a
  // corrected receipt would otherwise render as "In" beside a negative
  // amount. Naming it a reversal is clearer than being technically correct.
  if (row.reversesId) {
    return <CrmStatusPill label="Reversal" tone="warning" dot={false} size="sm" />;
  }
  // A bill taken on credit moved no cash, so it is not "Out". "On credit"
  // rather than "Unpaid": an entry is a permanent fact and cannot change
  // once written, so a status label would stay "Unpaid" long after the
  // vendor is paid. Whether a vendor is still owed is answered by their
  // balance on Payables. Neutral, because it describes; it does not warn.
  if (row.isCash === false) {
    return <CrmStatusPill label="On credit" tone="neutral" dot={false} size="sm" />;
  }
  return (
    <CrmStatusPill
      label={row.direction === 'in' ? 'In' : 'Out'}
      tone={row.direction === 'in' ? 'success' : 'info'}
      dot={false}
      size="sm"
    />
  );
}

export interface CashRowProps {
  row: LedgerEntry;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
}

/**
 * One ledger entry, one line: when, whose money on which project, what it
 * was, which way the cash went, and how much. It is only read — the row opens
 * nothing; the project number is the one link.
 */
function CashRowInner({ row, index, entering }: CashRowProps): JSX.Element {
  return (
    <CalmRow rowId={row.id} className={ROW_GRID} index={index} entering={entering}>
      {/* Date */}
      <div className={cn(CELL.date, ABOVE, 'min-w-0')}>
        <span className={cn(FACT, 'tabular-nums')}>{formatBusinessDate(row.valueDate)}</span>
        {/* Flagged because a historical row's real value date is unrecoverable,
            and treating a guess as fact is how ageing quietly goes wrong. */}
        {row.valueDateIsInferred ? <span className={NOTE}>approx.</span> : null}
      </div>

      {/* Customer and project */}
      <div className={cn(CELL.who, ABOVE, 'min-w-0')}>
        <span
          title={row.customerName ?? undefined}
          className="block truncate text-[15px] font-semibold tracking-[-0.01em]"
        >
          {row.customerName ?? '—'}
        </span>
        {row.projectId ? (
          <NextLink
            href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: row.projectId })}
            prefetch={false}
            className="block truncate text-[12px] tabular-nums no-underline hover:underline"
            style={{ color: color.accent }}
          >
            {row.projectNumber ?? 'View project'}
          </NextLink>
        ) : null}
      </div>

      {/* Detail */}
      <div className={cn(CELL.detail, ABOVE, 'min-w-0')}>
        <Detail row={row} />
      </div>

      {/* Entry and flow */}
      <div
        className={cn(
          CELL.entry,
          ABOVE,
          'flex min-w-0 flex-col items-end gap-1 @[960px]:items-start',
        )}
      >
        <Flow row={row} />
        <span className="block whitespace-nowrap text-[12px] font-medium tabular-nums text-foreground-secondary">
          {row.entryNo}
        </span>
      </div>

      {/* Amount — signed here, unlike the approvals queue: this IS the cash
          position, so a negative row must read as money leaving. */}
      <div className={cn(CELL.amount, ABOVE, 'min-w-0 text-right')}>
        <span
          className="block whitespace-nowrap text-[16px] font-semibold tabular-nums"
          style={{
            // Grey is "no cash moved". A reversal is a correction, signed so
            // undoing a bill never reads as money coming in; a bill on credit is
            // a debt taken on, unsigned so it never reads as money leaving.
            color:
              row.reversesId || row.isCash === false
                ? color['text-secondary']
                : row.amountPaise < 0
                  ? color.danger
                  : color.success,
          }}
        >
          {row.reversesId && row.amountPaise > 0 ? '+' : ''}
          {formatPaise(
            row.isCash === false && !row.reversesId ? Math.abs(row.amountPaise) : row.amountPaise,
          )}
        </span>
      </div>
    </CalmRow>
  );
}

export const CashRow = memo(CashRowInner);

/** One placeholder shaped like a ledger row, so nothing jumps when data lands. */
export function CashRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={cn(CELL.date, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-20')} />
      </div>
      <div className={cn(CELL.who, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-2/5')} />
      </div>
      <div className={cn(CELL.detail, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-3/4')} />
        <span className={cn(BONE, 'h-3 w-1/2')} />
      </div>
      <div className={cn(CELL.entry, 'flex flex-col items-end gap-2 @[960px]:items-start')}>
        <span className={cn(BONE, 'h-5 w-12')} />
        <span className={cn(BONE, 'h-3 w-28')} />
      </div>
      <div className={cn(CELL.amount, 'flex justify-end')}>
        <span className={cn(BONE, 'h-4 w-24')} />
      </div>
    </div>
  );
}
