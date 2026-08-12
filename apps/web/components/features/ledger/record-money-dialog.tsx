'use client';

import { Alert, Button, CircularProgress } from '@mui/material';
import { EXPENSE_CATEGORY_LABELS } from '@tejas96/shared';
import { ExpenseCategory, PaymentMethod } from '@tejas96/shared/types';
import { type JSX, useState } from 'react';

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
  type LedgerEntry,
  type MilestoneBalance,
  type ProofDocumentInput,
} from '@/lib/hooks/resources/ledger';
import { formatPaise, rupeesToPaise } from '@/lib/utils/paise';

type Mode = 'receipt' | 'expense';

interface RecordMoneyDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  mode: Mode;
  /** Shown so the operator can see where an un-targeted receipt will land. */
  milestones?: MilestoneBalance[];
  /**
   * Called after a receipt has been saved, with the entry that was created.
   *
   * Fired after the dialog closes and deliberately not awaited: the payment is
   * already committed, so nothing this does may block the operator or make a
   * successful payment look like a failure.
   */
  onReceiptRecorded?: (entry: LedgerEntry) => void | Promise<void>;
}

/** Form-only sentinel — never sent to the API; resolved to trimmed custom text on submit. */
const CATEGORY_OTHER = 'other';

const EXPENSE_CATEGORY_OPTIONS = [
  ...Object.values(ExpenseCategory).map((c) => ({
    value: c,
    label: EXPENSE_CATEGORY_LABELS[c],
  })),
  { value: CATEGORY_OTHER, label: 'Other' },
];

function resolveExpenseCategory(category: string, categoryOther: string): string {
  if (category === CATEGORY_OTHER) return categoryOther.trim();
  return category;
}

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
  onReceiptRecorded,
}: RecordMoneyDialogProps): JSX.Element {
  const { recordReceipt, recordExpense } = useLedgerMutations(projectId);
  const [amount, setAmount] = useState('');
  const [valueDate, setValueDate] = useState(todayIst());
  const [method, setMethod] = useState<string>(PaymentMethod.UPI);
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState<string>(ExpenseCategory.MATERIALS);
  const [categoryOther, setCategoryOther] = useState('');
  const [categoryOtherTouched, setCategoryOtherTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<ProofDocumentInput | null>(null);
  const [proofName, setProofName] = useState('');
  const [uploading, setUploading] = useState(false);

  const isReceipt = mode === 'receipt';
  const pending = recordReceipt.isPending || recordExpense.isPending;
  const amountPaise = amount ? rupeesToPaise(Number(amount)) : 0;
  const categoryValid =
    isReceipt ||
    (category !== CATEGORY_OTHER
      ? true
      : categoryOther.trim().length > 0 && categoryOther.trim().length <= 30);
  const showCategoryOtherError =
    !isReceipt &&
    category === CATEGORY_OTHER &&
    (categoryOtherTouched || amountPaise > 0) &&
    !categoryOther.trim();
  // Submit is disabled on these, and without a reason the operator just sees a
  // dead button. The category length is not covered here on purpose: the input
  // carries maxLength=30, so the browser refuses the 31st character and a
  // message for it could never be reached.
  const showAmountError = amountTouched && amountPaise <= 0;
  const showFutureDateError = valueDate > todayIst();
  const valid = amountPaise > 0 && valueDate <= todayIst() && categoryValid;

  const reset = (): void => {
    setAmount('');
    setValueDate(todayIst());
    setMethod(PaymentMethod.UPI);
    setReference('');
    setCategory(ExpenseCategory.MATERIALS);
    setCategoryOther('');
    setCategoryOtherTouched(false);
    setAmountTouched(false);
    setPayee('');
    setNotes('');
    setProof(null);
    setProofName('');
  };

  const submit = async (): Promise<void> => {
    if (!valid) return;
    if (isReceipt) {
      const entry = await recordReceipt.mutateAsync({
        amountPaise,
        valueDate,
        paymentMethod: method,
        reference: reference || undefined,
        notes: notes || undefined,
        proofDocument: proof ?? undefined,
      });
      reset();
      onClose();
      // Not awaited, and after onClose: rendering the PDF takes a second or two
      // and the operator has no reason to wait for it. Errors are handled inside
      // the callback — a failure here leaves the money recorded and the receipt
      // regenerable from the entries table.
      void onReceiptRecorded?.(entry);
      return;
    }

    await recordExpense.mutateAsync({
      amountPaise,
      valueDate,
      category: resolveExpenseCategory(category, categoryOther),
      payee: payee || undefined,
      paymentMethod: method,
      notes: notes || undefined,
      proofDocument: proof ?? undefined,
    });
    reset();
    onClose();
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && handleClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>{isReceipt ? 'Record payment received' : 'Record expense'}</MUIDialogTitle>
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
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setAmountTouched(true)}
            placeholder="0.00"
            autoFocus
            error={showAmountError ? 'Enter an amount greater than zero.' : undefined}
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
                onChange={(e) => {
                  const next = String(e.target.value);
                  setCategory(next);
                  if (next !== CATEGORY_OTHER) {
                    setCategoryOther('');
                    setCategoryOtherTouched(false);
                  }
                }}
                options={EXPENSE_CATEGORY_OPTIONS}
              />
              {category === CATEGORY_OTHER && (
                <MUIInput
                  fieldLabel="Specify category"
                  required
                  value={categoryOther}
                  onChange={(e) => setCategoryOther(e.target.value)}
                  onBlur={() => setCategoryOtherTouched(true)}
                  placeholder="e.g. Insurance, Training"
                  inputProps={{ maxLength: 30 }}
                  error={showCategoryOtherError ? 'Please specify the category' : undefined}
                  disabled={pending || uploading}
                />
              )}
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
        <Button onClick={handleClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!valid || pending || uploading}
          startIcon={pending ? <CircularProgress size={16} /> : undefined}
        >
          {isReceipt ? 'Record payment' : 'Record expense'}
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
