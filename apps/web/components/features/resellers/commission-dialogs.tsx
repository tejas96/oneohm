'use client';

import { Button } from '@mui/material';
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
import { formatPaise } from '@/lib/utils/paise';

/**
 * A reason, required, at least 3 characters — used for Cancel (this file) and
 * Dismiss (`missing-commissions-strip.tsx`). `MUIDialog` only knows
 * `onOpenChange`, not a bare `onClose`, so every dialog here closes through
 * `onOpenChange={(next) => !next && onClose()}` — matching `PayVendorDialog`.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
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
          inputProps={{ maxLength: 500 }}
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
  const [rate, setRate] = useState(String(row.ratePercent));
  const [reason, setReason] = useState('');
  const baseN = Number(base);
  const rateN = Number(rate);
  const valid =
    Number.isFinite(baseN) &&
    baseN >= 0 &&
    Number.isFinite(rateN) &&
    rateN >= 0 &&
    rateN <= 100 &&
    reason.trim().length >= 3;
  const previewPaise = Math.round((Math.round(baseN * 100) * Math.round(rateN * 100)) / 10_000);
  return (
    <MUIDialog open onOpenChange={(next) => !next && onClose()}>
      <MUIDialogHeader>
        <MUIDialogTitle>Edit {row.quoteNumber}</MUIDialogTitle>
        <MUIDialogDescription>
          Saving sends it back to Pending. It needs approval again.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <MUIInput
          fieldLabel="Base (₹, before GST, after discount)"
          value={base}
          onChange={(e) => setBase(e.target.value)}
        />
        <MUIInput fieldLabel="Rate (%)" value={rate} onChange={(e) => setRate(e.target.value)} />
        <div>
          Commission: <strong>{valid ? formatPaise(previewPaise) : '—'}</strong>
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
                baseAmount: baseN !== row.basePaise / 100 ? baseN : undefined,
                ratePercent: rateN !== row.ratePercent ? rateN : undefined,
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
}: {
  rows: CommissionRow[];
  onClose: () => void;
}): JSX.Element {
  const m = useCommissionMutations();
  const [valueDate, setValueDate] = useState(todayIst());
  const [method, setMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const total = rows.reduce((s, r) => s + r.amountPaise, 0);
  const valid = reference.trim().length >= 3 && Boolean(valueDate);
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
              { onSuccess: onClose },
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
  const [date, setDate] = useState(todayIst());
  const [note, setNote] = useState('');
  const n = Number(amount);
  const valid = Number.isFinite(n) && n >= 0 && Math.round(n * 100) <= row.amountPaise && note.trim().length >= 3;
  const writeOff = valid ? row.amountPaise - Math.round(n * 100) : 0;
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
        />
        {writeOff > 0 && <div>{formatPaise(writeOff)} will be written off.</div>}
        <MUIInput fieldLabel="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
              { id: row.id, amountReceived: n, date, note: note.trim() },
              { onSuccess: onClose },
            )
          }
        >
          Close
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
