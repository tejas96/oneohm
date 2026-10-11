'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { IconButton, ListItemIcon, Menu } from '@mui/material';
import { type JSX, memo, useState } from 'react';

import { VendorBillList } from './vendor-bill-list';

import {
  ABOVE,
  BONE,
  CalmRow,
  ChevronIcon,
  SKELETON_CARD,
  stopRowClick,
} from '@/components/shared/calm-list';
import { CrmStatusPill } from '@/components/shared/crm-table';
import { GatedMenuItem } from '@/components/shared/guards';
import type { PayableRow } from '@/lib/hooks/resources/ledger';
import { color } from '@/lib/theme/tokens';
import { cn, formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/**
 * Wide: caret · vendor · payable · oldest unpaid · past terms · bills · ⋮ on
 * one line. The payable track holds "Advance ₹XX,XX,XXX.XX" unclipped — the
 * longest string that cell ever shows; an amount is never cut short. Narrow (the list itself under 960px): vendor and ⋮, then payable
 * beside oldest unpaid, then past terms beside bills.
 */
const ROW_GRID =
  'grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 @[960px]:grid-cols-[16px_minmax(0,1.6fr)_200px_120px_108px_64px_34px] @[960px]:gap-5';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
const CELL = {
  caret: `col-start-1 row-start-1 ${WIDE}`,
  vendor: `col-start-2 row-start-1 ${WIDE}`,
  payable: `col-start-2 row-start-2 @[960px]:text-right ${WIDE}`,
  oldest: `col-start-3 row-start-2 text-right @[960px]:text-left ${WIDE}`,
  pastTerms: `col-start-2 row-start-3 ${WIDE}`,
  bills: `col-start-3 row-start-3 text-right ${WIDE}`,
  actions: `col-start-3 row-start-1 ${WIDE}`,
} as const;

/** A cell is two lines on one rhythm: a figure over what it is. */
const FACT = 'block truncate text-[14px] text-foreground';
const NOTE = 'block truncate text-[12px] text-foreground-tertiary';

/** A muted dash, so an empty cell reads as "nothing" rather than as broken. */
function Empty(): JSX.Element {
  return <span className="block text-[14px] text-foreground-tertiary">—</span>;
}

/**
 * The row's `⋮` menu. Always visible — never a hover reveal — so the action
 * is discoverable without a mouse sweeping the row, matching every other
 * row menu in the app.
 *
 * `Pay` is gated on `finance.payments.record`, the same code the dialog
 * itself checks before submitting. `GatedMenuItem` keeps the item clickable
 * either way and explains itself when blocked, rather than going dead with no
 * explanation.
 */
function PayableRowMenu({
  row,
  onPay,
}: {
  row: PayableRow;
  onPay: (row: PayableRow) => void;
}): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const handleClose = (): void => setAnchorEl(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        aria-label={`Row actions for ${row.vendorName}`}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        // Its only item opens a dialog. While this menu fades out it still
        // traps focus, and pulled it back out of the dialog's Amount field —
        // which then counted as touched and said "Enter an amount" before
        // anyone typed. Let focus go, and do not hand it back to the ⋮ button.
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 160 } } }}
      >
        <GatedMenuItem
          permission="finance.payments.record"
          subject="Pay vendor"
          onAction={() => {
            handleClose();
            onPay(row);
          }}
        >
          <ListItemIcon>
            <PaymentsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Pay
        </GatedMenuItem>
      </Menu>
    </>
  );
}

export interface PayableRowProps {
  row: PayableRow;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
  /** Its bills are showing. */
  expanded: boolean;
  onToggle: (row: PayableRow) => void;
  /**
   * Opens the one `PayVendorDialog` the page owns. A callback rather than a
   * dialog per row: that mirrors `project-money-tab.tsx`'s `reversing` /
   * `waiving` dialogs — one `X | null` piece of state on the page, one
   * conditionally mounted dialog, a callback handed down to the row.
   */
  onPay: (row: PayableRow) => void;
}

/**
 * One vendor, one line: who, what we owe them, since when, how far past terms,
 * and on how many bills. Opening the row lists the bills and payments behind
 * the balance (`VendorBillList`).
 */
function PayableRowInner({
  row,
  index,
  entering,
  expanded,
  onToggle,
  onPay,
}: PayableRowProps): JSX.Element {
  // The number the page exists for, so it carries the weight — but only the
  // ADVANCE case gets a tone. A vendor debt under ordinary credit terms is not
  // by itself a problem (Past terms is the risk signal for that); a negative
  // balance is the one value that would read as a mistake if left the default
  // color, so it alone is called out, in the success tone the design calls
  // for, never red.
  const isAdvance = row.payablePaise < 0;

  return (
    <CalmRow
      rowId={row.vendorId}
      className={ROW_GRID}
      label={`${expanded ? 'Hide' : 'Show'} the bills and payments for ${row.vendorName}`}
      onOpen={() => onToggle(row)}
      index={index}
      entering={entering}
      expanded={expanded}
      expansion={<VendorBillList vendorId={row.vendorId} />}
    >
      {/* Caret */}
      <span
        aria-hidden
        className={cn(
          CELL.caret,
          ABOVE,
          'pointer-events-none flex text-foreground-tertiary transition-transform duration-200 ease-calm motion-reduce:transition-none',
          expanded && 'rotate-90 text-primary-dark',
        )}
      >
        <ChevronIcon direction="right" size={16} />
      </span>

      {/* Vendor */}
      <div className={cn(CELL.vendor, ABOVE, 'flex min-w-0 items-center gap-2')}>
        <div className="min-w-0">
          <span
            title={row.vendorName}
            className="block truncate text-[16px] font-semibold tracking-[-0.01em]"
          >
            {row.vendorName}
          </span>
          {row.vendorCode ? (
            <span className="block truncate text-[13px] text-foreground-secondary">
              {row.vendorCode}
            </span>
          ) : null}
        </div>
        {row.isInactive ? (
          <span className="shrink-0">
            <CrmStatusPill label="Inactive" tone="neutral" dot={false} size="sm" />
          </span>
        ) : null}
      </div>

      {/* Payable */}
      <div className={cn(CELL.payable, ABOVE, 'min-w-0')}>
        <span
          className="block whitespace-nowrap text-[16px] font-semibold tabular-nums"
          style={isAdvance ? { color: color.success } : undefined}
        >
          {isAdvance ? `Advance ${formatPaise(-row.payablePaise)}` : formatPaise(row.payablePaise)}
        </span>
        <span className={NOTE}>Payable</span>
      </div>

      {/* Oldest unpaid: the oldest bill with money still owed on it, payments
          settling the oldest bills first (PAYABLES_PAGE_SQL). "Past terms"
          counts from this bill, so the two always agree. Blank once nothing
          is owed. */}
      <div className={cn(CELL.oldest, ABOVE, 'min-w-0')}>
        {row.oldestUnpaidBillDate ? (
          <span className={cn(FACT, 'tabular-nums')}>
            {formatBusinessDate(row.oldestUnpaidBillDate)}
          </span>
        ) : (
          <Empty />
        )}
        <span className={NOTE}>Oldest unpaid</span>
      </div>

      {/* Past terms: null means this vendor has no agreed credit period (no
          bill yet, or `creditDays` was never set) — "0 days" would invent a
          fact nobody holds. The API already floors a real value at 0, so `0`
          here is a genuine "within terms today", never confused with null. */}
      <div className={cn(CELL.pastTerms, ABOVE, 'min-w-0')}>
        {row.daysPastTerms == null ? (
          <Empty />
        ) : (
          <span className={cn(FACT, 'tabular-nums')}>{`${row.daysPastTerms} days`}</span>
        )}
        <span className={NOTE}>Past terms</span>
      </div>

      {/* Bills */}
      <div className={cn(CELL.bills, ABOVE, 'min-w-0')}>
        <span className={cn(FACT, 'tabular-nums')}>{row.billCount}</span>
        <span className={NOTE}>Bills</span>
      </div>

      {/* ⋮ — a click here never opens the row. */}
      <div className={cn(CELL.actions, ABOVE, 'flex justify-end')} onClick={stopRowClick}>
        <PayableRowMenu row={row} onPay={onPay} />
      </div>
    </CalmRow>
  );
}

export const PayableRowCard = memo(PayableRowInner);

/** One placeholder shaped like a vendor row, so nothing jumps when data lands. */
export function PayableRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <span className={cn(CELL.caret, BONE, 'size-4')} />
      <div className={cn(CELL.vendor, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-4 w-3/5')} />
        <span className={cn(BONE, 'h-3 w-1/4')} />
      </div>
      <div className={cn(CELL.payable, 'flex flex-col gap-2 @[960px]:items-end')}>
        <span className={cn(BONE, 'h-4 w-24')} />
        <span className={cn(BONE, 'h-3 w-12')} />
      </div>
      <div className={cn(CELL.oldest, 'flex flex-col items-end gap-2 @[960px]:items-start')}>
        <span className={cn(BONE, 'h-3.5 w-20')} />
        <span className={cn(BONE, 'h-3 w-16')} />
      </div>
      <div className={cn(CELL.pastTerms, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-14')} />
        <span className={cn(BONE, 'h-3 w-14')} />
      </div>
      <div className={cn(CELL.bills, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-5')} />
        <span className={cn(BONE, 'h-3 w-7')} />
      </div>
      <div className={cn(CELL.actions, 'flex justify-end')}>
        <span className={cn(BONE, 'size-[34px]')} />
      </div>
    </div>
  );
}
