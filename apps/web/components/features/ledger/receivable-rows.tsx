'use client';

import { Button } from '@mui/material';
import { bankLabel } from '@tejas96/shared/constants';
import NextLink from 'next/link';
import { type JSX, memo, useState } from 'react';

import { ageingBucket } from './ageing-bucket';
import { AttachBankDialog } from './attach-bank-dialog';
import { RecoveryMilestones } from './recovery-milestones';

import {
  ABOVE,
  BONE,
  CalmRow,
  ChevronIcon,
  SKELETON_CARD,
  stopRowClick,
} from '@/components/shared/calm-list';
import { CrmStatusPill } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { Receivable, RecoveryRow } from '@/lib/hooks/resources/ledger';
import { color } from '@/lib/theme/tokens';
import { cn, formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/** A cell is two lines on one rhythm: a figure over what it is. */
const FACT = 'block truncate text-[14px] text-foreground';
const NOTE = 'block truncate text-[12px] text-foreground-tertiary';
/** An amount is never cut short, so it does not truncate. */
const MONEY = 'block whitespace-nowrap text-[14px] tabular-nums text-foreground';
const MONEY_STRONG = 'block whitespace-nowrap text-[16px] font-bold tabular-nums';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';

function Empty(): JSX.Element {
  return <span className="block text-[14px] text-foreground-tertiary">—</span>;
}

/** Who owes: the name over the phone number to call. */
function Who({
  name,
  phone,
}: {
  name: string | null | undefined;
  phone: string | null | undefined;
}): JSX.Element {
  if (!name) return <Empty />;
  return (
    <>
      <span title={name} className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
        {name}
      </span>
      {phone ? (
        <span className="block truncate text-[13px] tabular-nums text-foreground-secondary">
          {phone}
        </span>
      ) : null}
    </>
  );
}

/**
 * Straight to the Finance tab: everyone arriving from a receivable is there to
 * record a payment or fix who pays a milestone, and the project Overview made
 * that an extra click every time.
 */
function ProjectLink({ id, number }: { id: string; number: string }): JSX.Element {
  return (
    <NextLink
      href={`${buildRoute(ROUTES.PROJECTS.DETAIL, { id })}?tab=finance`}
      prefetch={false}
      onClick={stopRowClick}
      className="block truncate text-[13px] font-medium tabular-nums no-underline hover:underline"
      style={{ color: color.accent }}
    >
      {number}
    </NextLink>
  );
}

// ============================================================================
// All open — one row per milestone
// ============================================================================

/**
 * Wide: customer · milestone and project · due · expected · received · short
 * by · ageing on one line. Seven facts need room, so this row goes wide later
 * than the others (the list itself at 1080px, not 960px): each amount has its
 * own track, sized for a crore, and the project number's track never drops
 * below the width of a whole number — neither is ever cut short.
 *
 * Narrow: customer beside what is short, then the milestone and project, then
 * the due date beside what was expected, then the ageing beside what was
 * received.
 */
const RECEIVABLE_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 @[1080px]:grid-cols-[minmax(0,1fr)_minmax(204px,1.1fr)_100px_128px_116px_152px_100px] @[1080px]:gap-4';

const WIDE_7 = '@[1080px]:col-auto @[1080px]:row-auto';
const RECEIVABLE_CELL = {
  who: `col-start-1 row-start-1 ${WIDE_7}`,
  what: `col-span-2 col-start-1 row-start-2 ${WIDE_7}`,
  due: `col-start-1 row-start-3 ${WIDE_7}`,
  expected: `col-start-2 row-start-3 text-right ${WIDE_7}`,
  received: `col-start-2 row-start-4 text-right ${WIDE_7}`,
  short: `col-start-2 row-start-1 text-right ${WIDE_7}`,
  ageing: `col-start-1 row-start-4 ${WIDE_7}`,
} as const;

export interface ReceivableRowProps {
  row: Receivable;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
}

/**
 * One open milestone, one line: who owes, for which milestone of which
 * project, when it was due, what was expected and received, how much is still
 * short, and how old the debt is. It is only read — the project number is the
 * one link.
 */
function ReceivableRowInner({ row, index, entering }: ReceivableRowProps): JSX.Element {
  const { label, tone } = ageingBucket(row.daysOverdue, !row.dueDate);

  return (
    <CalmRow rowId={row.milestoneId} className={RECEIVABLE_GRID} index={index} entering={entering}>
      {/* Customer */}
      <div className={cn(RECEIVABLE_CELL.who, ABOVE, 'min-w-0')}>
        <Who name={row.customerName} phone={row.customerPhone} />
      </div>

      {/* Milestone and project */}
      <div className={cn(RECEIVABLE_CELL.what, ABOVE, 'min-w-0')}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span title={row.milestoneName} className={FACT}>
            {row.milestoneName}
          </span>
          {/* The row carries the customer's name and phone, but the bank pays
              this one. Without the tag a collector calls the wrong party. */}
          {row.payerType === 'lender' ? (
            <span className="shrink-0">
              <CrmStatusPill label="Bank pays" tone="info" dot={false} size="sm" />
            </span>
          ) : null}
        </div>
        <ProjectLink id={row.projectId} number={row.projectNumber} />
      </div>

      {/* Due */}
      <div className={cn(RECEIVABLE_CELL.due, ABOVE, 'min-w-0')}>
        {row.dueDate ? (
          <span className={cn(FACT, 'tabular-nums')}>{formatBusinessDate(row.dueDate)}</span>
        ) : (
          <Empty />
        )}
        <span className={NOTE}>Due</span>
      </div>

      {/* Expected */}
      <div className={cn(RECEIVABLE_CELL.expected, ABOVE, 'min-w-0')}>
        <span className={MONEY}>{formatPaise(row.expectedPaise)}</span>
        <span className={NOTE}>Expected</span>
      </div>

      {/* Received. The table kept this as a hidden column; a card has no
          column menu, so it is always here. */}
      <div className={cn(RECEIVABLE_CELL.received, ABOVE, 'min-w-0')}>
        <span className={MONEY}>{formatPaise(row.allocatedPaise)}</span>
        <span className={NOTE}>Received</span>
      </div>

      {/* Short by — the number the page exists for, so it carries the weight. */}
      <div className={cn(RECEIVABLE_CELL.short, ABOVE, 'min-w-0')}>
        <span className={MONEY_STRONG} style={{ color: color.danger }}>
          {formatPaise(row.balancePaise)}
        </span>
        <span className={NOTE}>Short by</span>
      </div>

      {/* Ageing */}
      <div className={cn(RECEIVABLE_CELL.ageing, ABOVE, 'min-w-0')}>
        <CrmStatusPill label={label} tone={tone} size="sm" />
      </div>
    </CalmRow>
  );
}

export const ReceivableRow = memo(ReceivableRowInner);

/** One placeholder shaped like a milestone row, so nothing jumps when data lands. */
export function ReceivableRowSkeleton(): JSX.Element {
  return (
    <div className={cn(RECEIVABLE_GRID, SKELETON_CARD)}>
      <div className={cn(RECEIVABLE_CELL.who, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-2/5')} />
      </div>
      <div className={cn(RECEIVABLE_CELL.what, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-1/2')} />
        <span className={cn(BONE, 'h-3 w-3/5')} />
      </div>
      <div className={cn(RECEIVABLE_CELL.due, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-20')} />
        <span className={cn(BONE, 'h-3 w-8')} />
      </div>
      <div className={cn(RECEIVABLE_CELL.expected, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-24')} />
        <span className={cn(BONE, 'h-3 w-14')} />
      </div>
      <div className={cn(RECEIVABLE_CELL.received, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-20')} />
        <span className={cn(BONE, 'h-3 w-14')} />
      </div>
      <div className={cn(RECEIVABLE_CELL.short, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-4 w-24')} />
        <span className={cn(BONE, 'h-3 w-12')} />
      </div>
      <div className={RECEIVABLE_CELL.ageing}>
        <span className={cn(BONE, 'block h-5 w-20')} />
      </div>
    </div>
  );
}

// ============================================================================
// Recovery — one row per project
// ============================================================================

/**
 * The Bank cell owns its own dialog rather than lifting state to the page.
 *
 * Unlike the Payables row menu (one dialog, one piece of page state, a
 * callback handed to the row), a dialog owned by the cell that opened it needs
 * none: `AttachBankDialog`'s own `onSuccess` invalidates `ledgerKeys.root()`,
 * which is what `useRecovery` is keyed on, so the row's `financingBank`
 * arrives from the next refetch and this cell re-renders in place — no lost
 * scroll position, no lost filters.
 */
function BankCell({ row }: { row: RecoveryRow }): JSX.Element {
  const [open, setOpen] = useState(false);

  // A loan job with no lender milestone: the customer is being chased for the
  // bank's share. The banner above the list counts these; this says which.
  const noBankShare =
    row.wantsLoan && !row.hasLenderMilestone ? (
      <span className={NOTE}>Bank share not split out</span>
    ) : null;

  if (row.financingBank) {
    return (
      <>
        <span title={bankLabel(row.financingBank)} className={FACT}>
          {bankLabel(row.financingBank)}
        </span>
        {noBankShare ?? <span className={NOTE}>Bank</span>}
      </>
    );
  }

  // propertyId is non-null for every wantsLoan row (wants_loan lives on the
  // property row the query joins), so `!propertyId` is a defensive fallback.
  const { propertyId } = row;
  if (!row.wantsLoan || !propertyId) {
    return (
      <>
        <Empty />
        <span className={NOTE}>Bank</span>
      </>
    );
  }

  return (
    <>
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
    </>
  );
}

/**
 * Wide: caret · customer · project · still owed · oldest overdue · since meter
 * · bank on one line; the project track never drops below the width of a
 * whole project number. Narrow (the list itself under 960px): customer beside
 * what is still owed, then the project, then oldest overdue beside the days
 * since the meter, then the bank.
 */
const RECOVERY_GRID =
  'grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 @[960px]:grid-cols-[16px_minmax(0,1.2fr)_minmax(204px,1.15fr)_160px_124px_84px_minmax(0,1fr)] @[960px]:gap-5';

const RECOVERY_CELL = {
  caret: `col-start-1 row-start-1 ${WIDE}`,
  who: `col-start-2 row-start-1 ${WIDE}`,
  project: `col-span-2 col-start-2 row-start-2 ${WIDE}`,
  owed: `col-start-3 row-start-1 text-right ${WIDE}`,
  overdue: `col-start-2 row-start-3 ${WIDE}`,
  meter: `col-start-3 row-start-3 text-right ${WIDE}`,
  bank: `col-span-2 col-start-2 row-start-4 ${WIDE}`,
} as const;

export interface RecoveryRowProps {
  row: RecoveryRow;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  /** Its milestones are showing. */
  expanded: boolean;
  onToggle: (row: RecoveryRow) => void;
}

/**
 * Recovery, one row per project — the call list. Opening a row lists its open
 * milestones (`RecoveryMilestones`), which add up to "Still owed".
 */
function RecoveryRowInner({
  row,
  index,
  entering,
  expanded,
  onToggle,
}: RecoveryRowProps): JSX.Element {
  // Nothing overdue, and none of the open money has a date either.
  const { label, tone } = ageingBucket(
    row.worstDaysOverdue,
    row.undatedPaise === row.outstandingPaise,
  );

  return (
    <CalmRow
      rowId={row.projectId}
      className={RECOVERY_GRID}
      label={`${expanded ? 'Hide' : 'Show'} the open milestones of ${row.projectNumber}`}
      onOpen={() => onToggle(row)}
      index={index}
      entering={entering}
      expanded={expanded}
      expansion={<RecoveryMilestones projectId={row.projectId} />}
    >
      {/* Caret */}
      <span
        aria-hidden
        className={cn(
          RECOVERY_CELL.caret,
          ABOVE,
          'pointer-events-none flex text-foreground-tertiary transition-transform duration-200 ease-calm motion-reduce:transition-none',
          expanded && 'rotate-90 text-primary-dark',
        )}
      >
        <ChevronIcon direction="right" size={16} />
      </span>

      {/* Customer */}
      <div className={cn(RECOVERY_CELL.who, ABOVE, 'min-w-0')}>
        <Who name={row.customerName} phone={row.customerPhone} />
      </div>

      {/* Project */}
      <div className={cn(RECOVERY_CELL.project, ABOVE, 'min-w-0')}>
        <ProjectLink id={row.projectId} number={row.projectNumber} />
        <span className={NOTE}>
          {row.openMilestones} open {row.openMilestones === 1 ? 'milestone' : 'milestones'}
        </span>
      </div>

      {/* Still owed */}
      <div className={cn(RECOVERY_CELL.owed, ABOVE, 'min-w-0')}>
        <span className={MONEY_STRONG} style={{ color: color.danger }}>
          {formatPaise(row.outstandingPaise)}
        </span>
        <span className={NOTE}>Still owed</span>
        {/* Only when it differs: "₹X overdue" under an equal ₹X says nothing. */}
        {row.overduePaise > 0 && row.overduePaise < row.outstandingPaise ? (
          <span className="block whitespace-nowrap text-[12px] tabular-nums text-foreground-tertiary">
            {formatPaise(row.overduePaise)} overdue
          </span>
        ) : null}
      </div>

      {/* Oldest overdue */}
      <div className={cn(RECOVERY_CELL.overdue, ABOVE, 'min-w-0')}>
        <CrmStatusPill label={label} tone={tone} size="sm" />
        <span className={cn(NOTE, 'mt-0.5')}>Oldest overdue</span>
      </div>

      {/* Since meter. Null, never 0 — a project commissioned months ago must
          never read as "commissioned today". Null means the meter task
          predates activity logging, not that zero days have passed. */}
      <div className={cn(RECOVERY_CELL.meter, ABOVE, 'min-w-0')}>
        {row.daysSinceMeter == null ? (
          <Empty />
        ) : (
          <span className={cn(FACT, 'tabular-nums')}>{`${row.daysSinceMeter}d`}</span>
        )}
        <span className={NOTE}>Since meter</span>
      </div>

      {/* Bank — its button and dialog never open the row. */}
      <div className={cn(RECOVERY_CELL.bank, ABOVE, 'min-w-0')} onClick={stopRowClick}>
        <BankCell row={row} />
      </div>
    </CalmRow>
  );
}

export const RecoveryRowCard = memo(RecoveryRowInner);

/** One placeholder shaped like a recovery row, so nothing jumps when data lands. */
export function RecoveryRowSkeleton(): JSX.Element {
  return (
    <div className={cn(RECOVERY_GRID, SKELETON_CARD)}>
      <span className={cn(RECOVERY_CELL.caret, BONE, 'size-4')} />
      <div className={cn(RECOVERY_CELL.who, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-2/5')} />
      </div>
      <div className={cn(RECOVERY_CELL.project, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-40')} />
        <span className={cn(BONE, 'h-3 w-24')} />
      </div>
      <div className={cn(RECOVERY_CELL.owed, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-4 w-24')} />
        <span className={cn(BONE, 'h-3 w-16')} />
      </div>
      <div className={cn(RECOVERY_CELL.overdue, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-5 w-20')} />
        <span className={cn(BONE, 'h-3 w-20')} />
      </div>
      <div className={cn(RECOVERY_CELL.meter, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-8')} />
        <span className={cn(BONE, 'h-3 w-16')} />
      </div>
      <div className={cn(RECOVERY_CELL.bank, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-28')} />
        <span className={cn(BONE, 'h-3 w-8')} />
      </div>
    </div>
  );
}
