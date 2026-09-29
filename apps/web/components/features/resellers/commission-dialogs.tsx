'use client';

import { Button } from '@mui/material';
import { PaymentMethod } from '@tejas96/shared/types';
import { commissionAmount } from '@tejas96/shared/utils';
import { type JSX, useState } from 'react';

import { METHOD_OPTIONS, todayIst } from '@/components/features/ledger/pay-vendor-dialog';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
} from '@/components/ui';
import { useCommissionMutations, type CommissionRow } from '@/lib/hooks/resources/resellers';
import {
  formatPaise,
  paiseToRupees,
  parseRupeeInput,
  rupeeInputError,
  type RupeeInput,
} from '@/lib/utils/paise';

/**
 * `parseRupeeInput`, but ₹0 is a valid answer here.
 *
 * Every other money dialog in the app (a vendor payment, a commission payout)
 * never wants a ₹0 entry, so `parseRupeeInput` treats it as `'not-positive'`.
 * Editing a commission's base to ₹0 and writing off a whole recovery are both
 * real, backend-sanctioned states — `EditCommissionDto.baseAmount` is
 * `@Min(0)` and `CloseRecoveryDto` documents "0 writes it all off" — so this
 * re-derives the one case `parseRupeeInput` would otherwise reject, and
 * defers to it for everything else: comma handling, decimal precision, the
 * size ceiling, and the exact same error messages.
 */
function parseRupeeInputAllowZero(text: string): RupeeInput {
  const cleaned = text.replace(/[,\s₹]/g, '');
  if (cleaned !== '' && Number(cleaned) === 0) return { ok: true, paise: 0 };
  return parseRupeeInput(text);
}

/** `rupeeInputError` for the fields above, where ₹0 is allowed: a negative
 *  number must not be told "greater than zero". */
function rupeeInputErrorAllowZero(result: RupeeInput): string | undefined {
  if (!result.ok && result.reason === 'not-positive') return 'Enter zero or more.';
  return rupeeInputError(result);
}

type RateInput = { ok: true; value: number } | { ok: false; reason: 'empty' | 'invalid' };

/** A commission rate: 0–100, at most 2 decimal places — mirrors `EditCommissionDto.ratePercent`. */
function parseRatePercent(text: string): RateInput {
  const cleaned = text.trim();
  if (cleaned === '') return { ok: false, reason: 'empty' };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false, reason: 'invalid' };
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100) return { ok: false, reason: 'invalid' };
  return { ok: true, value };
}

function rateInputError(result: RateInput): string | undefined {
  if (result.ok || result.reason === 'empty') return undefined;
  return 'Enter a percentage from 0 to 100, with at most 2 decimals.';
}

/**
 * A reason, required, at least 3 characters — used for Cancel (this file) and
 * Dismiss (`missing-commissions-strip.tsx`), whose backend limits differ
 * (`ReasonDto.reason` allows 500 characters, `DismissMissingDto.note` only
 * 300), hence the `maxLength` prop rather than a hardcoded value. `MUIDialog`
 * only knows `onOpenChange`, not a bare `onClose`, so every dialog here
 * closes through `onOpenChange={(next) => !next && onClose()}` — matching
 * `PayVendorDialog`.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  busy,
  maxLength = 500,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  maxLength?: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}): JSX.Element {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= 3;
  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <MUIDialogHeader>
        <MUIDialogTitle>{title}</MUIDialogTitle>
        <MUIDialogDescription>{description}</MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput
          fieldLabel="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength }}
        />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" disabled={!ok || busy} onClick={() => onConfirm(reason.trim())}>
          {confirmLabel}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

export function EditCommissionDialog({
  row,
  onClose,
}: {
  row: CommissionRow;
  onClose: () => void;
}): JSX.Element {
  const m = useCommissionMutations();
  const [base, setBase] = useState(String(row.basePaise / 100));
  const [baseTouched, setBaseTouched] = useState(false);
  const [rate, setRate] = useState(String(row.ratePercent));
  const [rateTouched, setRateTouched] = useState(false);
  const [reason, setReason] = useState('');

  // Errors show as soon as the value differs from what was loaded, not only
  // after the field loses focus — otherwise a bad rate just greys Save with
  // no word of why.
  const parsedBase = parseRupeeInputAllowZero(base);
  const baseError =
    baseTouched || base !== String(row.basePaise / 100)
      ? rupeeInputErrorAllowZero(parsedBase)
      : undefined;

  const parsedRate = parseRatePercent(rate);
  const rateError =
    rateTouched || rate !== String(row.ratePercent) ? rateInputError(parsedRate) : undefined;

  const alreadyPending = row.state === 'pending' || row.state === 'needs_amount';

  // Compared in paise / basis points, not floats — and required to actually
  // differ, or the backend's `EditCommissionDto` handler 400s with "Change
  // the base, the rate, or both." Computed once, as the payload value itself
  // (`undefined` when unchanged) rather than a boolean re-checked later
  // against `.ok` a second time.
  const baseAmountForSave =
    parsedBase.ok && parsedBase.paise !== row.basePaise
      ? paiseToRupees(parsedBase.paise)
      : undefined;
  const ratePercentForSave =
    parsedRate.ok && Math.round(parsedRate.value * 100) !== Math.round(row.ratePercent * 100)
      ? parsedRate.value
      : undefined;

  const valid =
    parsedBase.ok &&
    parsedRate.ok &&
    (baseAmountForSave !== undefined || ratePercentForSave !== undefined) &&
    reason.trim().length >= 3;

  // The shared, server-matching formula — `commissionAmount` takes and
  // returns rupees, so the paise preview is derived, never duplicated inline.
  const previewPaise =
    parsedBase.ok && parsedRate.ok
      ? Math.round(commissionAmount(paiseToRupees(parsedBase.paise), parsedRate.value) * 100)
      : null;

  return (
    <MUIDialog open onOpenChange={(next) => !next && onClose()}>
      <MUIDialogHeader>
        <MUIDialogTitle>Edit {row.quoteNumber}</MUIDialogTitle>
        <MUIDialogDescription>
          {alreadyPending
            ? 'Change the base, the rate, or both, and say why.'
            : 'Saving sends it back to Pending. It needs approval again.'}
        </MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput
          fieldLabel="Base (₹, before GST, after discount)"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          onBlur={() => setBaseTouched(true)}
          error={baseError}
        />
        <MUIInput
          fieldLabel="Rate (%)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={() => setRateTouched(true)}
          error={rateError}
        />
        <div>
          Commission: <strong>{previewPaise !== null ? formatPaise(previewPaise) : '—'}</strong>
        </div>
        <MUIInput
          fieldLabel="Why"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
        />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button
          variant="contained"
          disabled={!valid || m.edit.isPending}
          onClick={() =>
            m.edit.mutate(
              {
                id: row.id,
                baseAmount: baseAmountForSave,
                ratePercent: ratePercentForSave,
                reason: reason.trim(),
              },
              { onSuccess: onClose },
            )
          }
        >
          Save
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

export function RecordCommissionPaymentDialog({
  rows,
  onClose,
  onSent,
}: {
  rows: CommissionRow[];
  onClose: () => void;
  /** Called once the payment is sent for approval (not on Back). */
  onSent?: () => void;
}): JSX.Element {
  const m = useCommissionMutations();
  const [valueDate, setValueDate] = useState(todayIst());
  // Same default as the vendor payment dialog; every value here is one the server accepts.
  const [method, setMethod] = useState<string>(PaymentMethod.UPI);
  const [reference, setReference] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const total = rows.reduce((s, r) => s + r.amountPaise, 0);
  // The server already refuses a future value date; this is the client-side
  // guard pay-vendor-dialog.tsx already uses, kept word-for-word.
  const showFutureDateError = valueDate > todayIst();
  const valid = reference.trim().length >= 3 && Boolean(valueDate) && !showFutureDateError;
  return (
    <MUIDialog open onOpenChange={(next) => !next && onClose()}>
      <MUIDialogHeader>
        <MUIDialogTitle>Record payment · {formatPaise(total)}</MUIDialogTitle>
        <MUIDialogDescription>
          {rows.length === 1 ? rows[0]?.quoteNumber : `${rows.length} deals, one transfer`}. It goes
          to Payment Approvals. The expense lands on each project when a second person approves it.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput
          fieldLabel="Paid on"
          type="date"
          value={valueDate}
          onChange={(e) => setValueDate(e.target.value)}
          inputProps={{ max: todayIst() }}
          error={
            showFutureDateError
              ? `Pick today or earlier — money cannot arrive in the future.`
              : undefined
          }
        />
        <MUISelect
          fieldLabel="Method"
          value={method}
          onChange={(e) => setMethod(String(e.target.value))}
          options={METHOD_OPTIONS}
        />
        <MUIInput
          fieldLabel="Reference (UTR / cheque no.)"
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          inputProps={{ maxLength: 100 }}
        />
        <MUIInput
          fieldLabel="Reseller's invoice no. (optional)"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          inputProps={{ maxLength: 50 }}
        />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button
          variant="contained"
          disabled={!valid || m.recordPayment.isPending}
          onClick={() =>
            m.recordPayment.mutate(
              {
                commissionIds: rows.map((r) => r.id),
                valueDate,
                paymentMethod: method,
                reference: reference.trim(),
                invoiceNumber: invoiceNumber.trim() || undefined,
              },
              {
                onSuccess: () => {
                  onSent?.();
                  onClose();
                },
              },
            )
          }
        >
          Send for approval
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

export function CloseRecoveryDialog({
  row,
  onClose,
}: {
  row: CommissionRow;
  onClose: () => void;
}): JSX.Element {
  const m = useCommissionMutations();
  const [amount, setAmount] = useState(String(row.amountPaise / 100));
  const [amountTouched, setAmountTouched] = useState(false);
  const [date, setDate] = useState(todayIst());
  const [note, setNote] = useState('');

  const parsedAmount = parseRupeeInputAllowZero(amount);
  // Cannot recover more than was paid on this commission — a hard rule, not
  // the "advance" case pay-vendor-dialog allows, so it blocks Close rather
  // than just warning.
  const overCap = parsedAmount.ok && parsedAmount.paise > row.amountPaise;
  const amountError =
    amountTouched || amount !== String(row.amountPaise / 100)
      ? (rupeeInputErrorAllowZero(parsedAmount) ??
        (overCap
          ? `Cannot exceed ${formatPaise(row.amountPaise)} — that is all that was paid.`
          : undefined))
      : undefined;

  const valid = parsedAmount.ok && !overCap && note.trim().length >= 3;
  const writeOff = parsedAmount.ok && !overCap ? row.amountPaise - parsedAmount.paise : 0;

  return (
    <MUIDialog open onOpenChange={(next) => !next && onClose()}>
      <MUIDialogHeader>
        <MUIDialogTitle>Close recovery · {row.quoteNumber}</MUIDialogTitle>
        <MUIDialogDescription>
          We paid {formatPaise(row.amountPaise)} on a deal that died. How much came back?
        </MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput
          fieldLabel="Received back (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => setAmountTouched(true)}
          error={amountError}
        />
        {writeOff > 0 && <div>{formatPaise(writeOff)} will be written off.</div>}
        <MUIInput
          fieldLabel="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <MUIInput
          fieldLabel="Note"
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          inputProps={{ maxLength: 500 }}
        />
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={onClose}>Back</Button>
        <Button
          variant="contained"
          disabled={!valid || m.closeRecovery.isPending}
          onClick={() =>
            m.closeRecovery.mutate(
              {
                id: row.id,
                amountReceived: paiseToRupees(parsedAmount.ok ? parsedAmount.paise : 0),
                date,
                note: note.trim(),
              },
              { onSuccess: onClose },
            )
          }
        >
          Close recovery
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
