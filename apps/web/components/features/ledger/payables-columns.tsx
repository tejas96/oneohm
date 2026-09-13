'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { Box, IconButton, ListItemIcon, Menu } from '@mui/material';
import { type JSX, useState } from 'react';

import { CrmStatusPill, type CrmColumn } from '@/components/shared/crm-table';
import { GatedMenuItem } from '@/components/shared/guards';
import type { PayableRow } from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/** A muted dash, so an empty cell reads as "nothing" rather than as broken. */
function Empty(): JSX.Element {
  return <Box sx={{ color: color['text-tertiary'] }}>—</Box>;
}

/**
 * The row's `⋮` menu. Always visible — never a hover reveal — so the action
 * is discoverable without a mouse sweeping the row, matching every other
 * CrmTable row menu in the app.
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

/**
 * `onPay` is threaded in rather than the columns being a static export like
 * `RECEIVABLE_COLUMNS` — receivables has no row menu, payables does, and the
 * one dialog it opens is owned by the page (`FinancePayablesPage`), not by
 * each row. That mirrors `project-money-tab.tsx`'s `reversing`/`waiving`
 * dialogs: one `X | null` piece of state on the page, one conditionally
 * mounted dialog, a callback handed down to the row that can trigger it.
 */
export function buildPayableColumns(onPay: (row: PayableRow) => void): CrmColumn<PayableRow>[] {
  return [
    {
      field: 'vendorName',
      header: 'Vendor',
      track: crm['col-pay-vendor'],
      renderCell: (row) => (
        <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
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
              {row.vendorName}
            </Box>
            {row.vendorCode ? (
              <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
                {row.vendorCode}
              </Box>
            ) : null}
          </Box>
          {row.isInactive ? (
            <Box sx={{ flexShrink: 0 }}>
              <CrmStatusPill label="Inactive" tone="neutral" dot={false} size="sm" />
            </Box>
          ) : null}
        </Box>
      ),
    },
    {
      field: 'payablePaise',
      header: 'Payable',
      track: crm['col-pay-payable'],
      align: 'right',
      cellSx: { pr: 1.5 },
      // The number the page exists for, so it carries the weight — but only
      // the ADVANCE case gets a tone. A vendor debt under ordinary credit
      // terms is not by itself a problem (Past terms is the risk signal for
      // that); a negative balance is the one value that would read as a
      // mistake if left the default color, so it alone is called out, in the
      // success tone the design calls for, never red.
      renderCell: (row) => {
        const isAdvance = row.payablePaise < 0;
        return (
          <Box sx={{ fontWeight: 700, color: isAdvance ? color.success : undefined }}>
            {isAdvance ? `Advance ${formatPaise(-row.payablePaise)}` : formatPaise(row.payablePaise)}
          </Box>
        );
      },
    },
    {
      field: 'oldestBillDate',
      header: 'Oldest bill',
      track: crm['col-pay-oldest'],
      // The oldest CREDIT bill, not the oldest unpaid one — `v_vendor_payable`
      // does no bill-by-bill matching, which is why this is labelled "Oldest
      // bill" rather than "Oldest unpaid bill". Do not relabel it.
      renderCell: (row) => (row.oldestBillDate ? formatBusinessDate(row.oldestBillDate) : <Empty />),
    },
    {
      field: 'daysPastTerms',
      header: 'Past terms',
      track: crm['col-pay-past-terms'],
      // Null means this vendor has no agreed credit period (no bill yet, or
      // `creditDays` was never set) — "0 days" would invent a fact nobody
      // holds. The API already floors a real value at 0, so `0` here is a
      // genuine "within terms today", never confused with null.
      renderCell: (row) => (row.daysPastTerms == null ? <Empty /> : `${row.daysPastTerms} days`),
    },
    {
      field: 'billCount',
      header: 'Bills',
      track: crm['col-pay-bills'],
      align: 'right',
      renderCell: (row) => <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.billCount}</Box>,
    },
    {
      field: 'actions',
      header: '',
      track: crm['col-pay-actions'],
      align: 'right',
      hideable: false,
      stopPropagation: true,
      renderCell: (row) => <PayableRowMenu row={row} onPay={onPay} />,
    },
  ];
}
