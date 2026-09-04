'use client';

import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { EXPENSE_CATEGORY_LABELS } from '@tejas96/shared';
import { ExpenseCategory, PaymentMethod } from '@tejas96/shared/types';
import { type JSX, useEffect, useRef, useState } from 'react';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
  MUITypography,
} from '@/components/ui';
import {
  uploadProofFile,
  useLedgerMutations,
  type MilestoneBalance,
  type ProofDocumentInput,
} from '@/lib/hooks/resources/ledger';
import { useGatedAction } from '@/lib/rbac';
import { formatPaise, paiseToRupees, parseRupeeInput, rupeeInputError } from '@/lib/utils/paise';

type Mode = 'receipt' | 'expense';

interface RecordMoneyDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  mode: Mode;
  /** Shown so the operator can see where an un-targeted receipt will land. */
  milestones?: MilestoneBalance[];
  /**
   * Set when the dialog was opened from a specific milestone's Record button,
   * so the amount can start at what that milestone is still owed.
   */
  forMilestone?: MilestoneBalance | null;
}

/**
 * The seven categories, and nothing else.
 *
 * There used to be an eighth option, "Other", with a free-text box beside it
 * whose contents were sent as the category verbatim. It is gone: it defeated
 * the point of having a fixed list, and it is what put `labour` alongside
 * `labor`, plus `Insurance` and `Other`, into the live ledger — making every
 * total grouped by category unreliable.
 *
 * Nothing is lost by removing it. `Miscellaneous` already covers the case the
 * escape hatch was reached for, and the detail that used to be typed into it
 * ("Insurance", "Training") belongs in the Notes field below, which is free
 * text by design and is not summed by anything.
 */
const EXPENSE_CATEGORY_OPTIONS = Object.values(ExpenseCategory).map((c) => ({
  value: c,
  label: EXPENSE_CATEGORY_LABELS[c],
}));

/** Today as an IST date, matching how the backend stamps a value date. */
function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Record money in or out.
 *
 * Two deliberate choices:
 *
 *  - **The date defaults to today but is editable.** Money frequently arrives
 *    days before anyone keys it in; forcing the entry date is what made every
 *    monthly figure wrong in the old system.
 *  - **The operator types rupees; we send paise.** Conversion happens once, here,
 *    with the same rounding rule the backend uses. Nothing downstream ever
 *    rounds again.
 *
 * Allocation is left to the server: a receipt fills milestones in order and
 * spills over. The preview below shows where it will land, so that is visible
 * rather than surprising.
 */
export function RecordMoneyDialog({
  open,
  onClose,
  projectId,
  mode,
  milestones = [],
  forMilestone = null,
}: RecordMoneyDialogProps): JSX.Element {
  const save = useGatedAction('finance.payments.record', () => undefined, 'Record money');
  const { recordReceipt, recordExpense } = useLedgerMutations(projectId);
  const [amount, setAmount] = useState('');

  const [valueDate, setValueDate] = useState(todayIst());
  const [method, setMethod] = useState<string>(PaymentMethod.UPI);
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.MATERIALS);
  const [amountTouched, setAmountTouched] = useState(false);
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<ProofDocumentInput | null>(null);
  const [proofName, setProofName] = useState('');
  const [uploading, setUploading] = useState(false);

  /*
   * Opened from a milestone row: start at what that milestone is still short
   * by, so the common case — the customer paid this term, in full — is one
   * click and a date.
   *
   * `balancePaise`, not `expectedPaise`. On every unpaid row the two are the
   * same number, which is what the schedule shows as both "Expected" and
   * "Short by". They part company the moment a milestone is part paid, and
   * there `expectedPaise` would suggest the FULL term again on top of what has
   * already been received — a double charge, pre-filled, one click from being
   * recorded. The balance is the amount actually owed either way.
   *
   * Re-seeded on every open rather than once on mount: a receipt recorded
   * since must not leave a stale suggestion behind. It stays editable, because
   * a customer paying part of a term is ordinary.
   */
  useEffect(() => {
    if (!open) return;
    setAmount(
      mode === 'receipt' && forMilestone && forMilestone.balancePaise > 0
        ? paiseToRupees(forMilestone.balancePaise).toFixed(2)
        : '',
    );
  }, [open, mode, forMilestone]);

  const isReceipt = mode === 'receipt';
  const pending = recordReceipt.isPending || recordExpense.isPending;
  // Same parser as the Bill customer dialog: accepts "1,000", refuses text and
  // amounts past the point where paise stop being exact, and says which.
  const parsedAmount = parseRupeeInput(amount);
  const amountPaise = parsedAmount.ok ? parsedAmount.paise : 0;
  // The category needs no validation any more: it is a dropdown over the fixed
  // list and starts on Materials, so it cannot be empty or unrecognised. The
  // check it replaces existed solely to police the free-text "Other" box.
  //
  // Submit is disabled on the two below, and without a message the operator
  // just sees a dead button.
  const showAmountError = amountTouched && !parsedAmount.ok;
  const showFutureDateError = valueDate > todayIst();
  const valid = parsedAmount.ok && valueDate <= todayIst();

  const reset = (): void => {
    setAmount('');
    setValueDate(todayIst());
    setMethod(PaymentMethod.UPI);
    setReference('');
    setCategory(ExpenseCategory.MATERIALS);
    setAmountTouched(false);
    setPayee('');
    setNotes('');
    setProof(null);
    setProofName('');
  };

  // A ref, not state: two clicks in the same tick both read the pre-render
  // value of a state flag, so state cannot stop a double submission.
  const inFlight = useRef(false);

  const submit = async (): Promise<void> => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    try {
      if (isReceipt) {
        await recordReceipt.mutateAsync({
          amountPaise,
          valueDate,
          paymentMethod: method,
          reference: reference || undefined,
          notes: notes || undefined,
          proofDocument: proof ?? undefined,
        });
        reset();
        onClose();
        return;
      }

      await recordExpense.mutateAsync({
        amountPaise,
        valueDate,
        category,
        payee: payee || undefined,
        paymentMethod: method,
        notes: notes || undefined,
        proofDocument: proof ?? undefined,
      });
      reset();
      onClose();
    } finally {
      inFlight.current = false;
    }
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && handleClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>{isReceipt ? 'Submit payment received' : 'Submit expense'}</MUIDialogTitle>
        <MUIDialogDescription>
          {isReceipt
            ? 'Enter the date the money actually arrived — not today, if it came in earlier.'
            : 'Company cost. This never changes what the customer owes.'}
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <MUIInput
            fieldLabel="Amount (₹)"
            /* Not type="number": that input rejects a comma before any handler
               sees it, so "1,000" could not be typed at all — and it also lets a
               scroll wheel over a focused field silently change an amount.
               inputMode keeps the numeric keypad on mobile; parseRupeeInput does
               the validating. */
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setAmountTouched(true)}
            placeholder="0.00"
            autoFocus
            error={
              showAmountError
                ? (rupeeInputError(parsedAmount) ?? 'Enter an amount greater than zero.')
                : undefined
            }
          />

          <MUIInput
            fieldLabel={isReceipt ? 'Date received' : 'Date paid'}
            type="date"
            value={valueDate}
            onChange={(e) => setValueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
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
            options={Object.values(PaymentMethod).map((m) => ({
              value: m,
              label: m.toUpperCase(),
            }))}
          />

          {isReceipt ? (
            <MUIInput
              fieldLabel="Reference (UTR / cheque no.)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          ) : (
            <>
              <MUISelect
                fieldLabel="Category"
                value={category}
                disabled={pending || uploading}
                onChange={(e) => setCategory(String(e.target.value) as ExpenseCategory)}
                options={EXPENSE_CATEGORY_OPTIONS}
              />
              <MUIInput
                fieldLabel="Paid to"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
              />
            </>
          )}

          <MUIInput
            fieldLabel="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
          />

          <div className="flex flex-col gap-1.5">
            <MUITypography variant="bodyPrimary" component="span" fontWeight={500}>
              {isReceipt ? 'Proof of payment' : 'Bill / receipt'}
            </MUITypography>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setProofName(file.name);
                setUploading(true);
                void uploadProofFile(file)
                  .then(setProof)
                  .catch(() => setProofName('Upload failed — try again'))
                  .finally(() => setUploading(false));
              }}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            {/* Never a blocker: a receipt without proof is allowed, just flagged.
                Refusing to record it would push staff back to spreadsheets. */}
            <MUITypography variant="finePrint" component="span">
              {uploading
                ? 'Uploading…'
                : proof
                  ? `Attached: ${proofName}`
                  : proofName || 'Optional — cheque photo, UPI screenshot or bank slip'}
            </MUITypography>
          </div>

          {isReceipt && amountPaise > 0 && milestones.length > 0 && (
            <AllocationPreview milestones={milestones} amountPaise={amountPaise} />
          )}
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Box sx={{ flex: 1, fontSize: '0.75rem', color: 'text.secondary', pr: 2 }}>
          Sent for verification. The customer&apos;s balance changes only after approval.
        </Box>
        <Button onClick={handleClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => (save.allowed ? void submit() : save.onGatedClick())}
          aria-disabled={!save.allowed}
          disabled={!valid || pending || uploading}
          startIcon={pending ? <CircularProgress size={16} /> : undefined}
        >
          Submit for approval
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

/**
 * Shows where the receipt will land before it is recorded.
 *
 * Mirrors the server's waterfall so the operator is never surprised — the same
 * fill-then-spill rule, including the leftover becoming customer credit. This is
 * a preview only; the server allocates authoritatively.
 */
function AllocationPreview({
  milestones,
  amountPaise,
}: {
  milestones: MilestoneBalance[];
  amountPaise: number;
}): JSX.Element {
  let remaining = amountPaise;
  const planned: Array<{ name: string; paise: number }> = [];

  for (const m of milestones) {
    if (remaining <= 0) break;
    if (m.derivedStatus === 'waived' || m.balancePaise <= 0) continue;
    const take = Math.min(remaining, m.balancePaise);
    planned.push({ name: m.name, paise: take });
    remaining -= take;
  }

  return (
    <Alert severity="info" variant="outlined">
      <MUITypography variant="bodyPrimary" fontWeight={500}>
        This payment will be applied to:
      </MUITypography>
      <ul className="mt-1 flex flex-col gap-0.5 text-sm">
        {planned.map((p) => (
          <li key={p.name} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="tabular-nums">{formatPaise(p.paise)}</span>
          </li>
        ))}
        {planned.length === 0 && <li>Nothing outstanding — it will sit as credit.</li>}
        {remaining > 0 && planned.length > 0 && (
          <li className="flex justify-between gap-4 border-t border-current/20 pt-0.5">
            <span>Credit (nothing left to apply it to)</span>
            <span className="tabular-nums">{formatPaise(remaining)}</span>
          </li>
        )}
      </ul>
    </Alert>
  );
}
