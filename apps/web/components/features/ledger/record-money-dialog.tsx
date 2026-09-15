'use client';

import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { EXPENSE_CATEGORY_LABELS } from '@tejas96/shared';
import { ExpenseCategory, PaymentMethod } from '@tejas96/shared/types';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';

import { VendorPickerControlled } from '@/components/features/inventory/components/shared/vendor-picker';
import { VendorFormDialog } from '@/components/features/inventory/components/vendor-form-dialog';
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
import { useVendors } from '@/lib/hooks/resources/vendors';
import { useGatedAction } from '@/lib/rbac';
import { formatPaymentMethod } from '@/lib/utils';
import { blurStayedInDialog } from '@/lib/utils/focus';
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
  const isReceipt = mode === 'receipt';
  const save = useGatedAction('finance.payments.record', () => undefined, 'Record money');
  const { recordReceipt, recordExpense } = useLedgerMutations(projectId);
  const [amount, setAmount] = useState('');

  const [valueDate, setValueDate] = useState(todayIst());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.MATERIALS);
  const [amountTouched, setAmountTouched] = useState(false);
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<ProofDocumentInput | null>(null);
  const [proofName, setProofName] = useState('');
  const [uploading, setUploading] = useState(false);
  // A credit bill is owed to somebody, so a vendor is required the moment
  // Credit is picked (`onCredit` below). Query is kept apart from the chosen
  // id for the same reason `VendorPicker`'s own RHF wrapper keeps them apart:
  // typing to search must not clobber a selection already made.
  const [vendorId, setVendorId] = useState('');
  const [vendorQuery, setVendorQuery] = useState('');
  // The name typed into the vendor search when "Add as a new vendor" was
  // picked; null while that dialog is closed.
  const [addingVendor, setAddingVendor] = useState<string | null>(null);

  /*
   * Vendor list for the Credit picker. Fetched unconditionally, same as
   * `VendorPicker` (the react-hook-form wrapper) does internally — it has no
   * `enabled` gate either — because `useVendors` takes no second argument to
   * pass one through to the underlying query. The picker itself only renders
   * on the expense side (see below), so the receipt side just carries an
   * unused list around for as long as it's open; it makes no extra request
   * beyond the one page already fetched here.
   */
  const {
    items: vendorItems,
    isFetching: vendorsLoading,
    setSearch: setVendorSearch,
  } = useVendors({
    syncToUrl: false,
    defaultPageSize: 25,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });

  useEffect(() => {
    setVendorSearch(vendorQuery);
  }, [vendorQuery, setVendorSearch]);

  const vendorOptions = useMemo(
    () =>
      vendorItems.map((v) => ({
        value: v.id,
        label: v.code ? `${v.name} (${v.code})` : v.name,
      })),
    [vendorItems],
  );

  // Picking a vendor and typing a free-text payee are the same fact recorded
  // two ways — exactly how `labour` and `labor` both reached the ledger as
  // separate categories. Choosing a vendor clears whatever was typed here so
  // only one of the two is ever sent, and the now-hidden field doesn't leave
  // a stale value riding along underneath it.
  const handleVendorChange = (next: string): void => {
    setVendorId(next);
    if (next) setPayee('');
  };

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
    // Belt and braces: this dialog's one caller today only ever mounts a
    // fresh instance per mode (never keeps one instance across a receipt/
    // expense flip), so this branch is not reachable in practice. Nothing in
    // the component's own types enforces that, though, and if it ever were
    // reached, a leftover `method` of `credit` would both fall out of the
    // Method select's own option list (filtered below on the receipt side)
    // and still be what gets submitted on a receipt call — money cannot be
    // received on credit. Clearing it here removes the possibility rather
    // than trusting the caller never to create it.
    if (mode === 'receipt') {
      setMethod((m) => (m === PaymentMethod.CREDIT ? PaymentMethod.UPI : m));
    }
  }, [open, mode, forMilestone]);

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
  // Never true on a receipt: Credit is not offered there (see the Method
  // options below), and money cannot be received on credit.
  const onCredit = !isReceipt && method === PaymentMethod.CREDIT;
  // No cash leaves for a credit bill, and the server refuses one with no
  // vendor ("A credit bill has to be owed to a vendor" — confirmed against
  // POST .../ledger/expenses), so submit stays blocked until one is chosen
  // rather than letting the operator find out from a 400.
  const valid = parsedAmount.ok && valueDate <= todayIst() && (!onCredit || Boolean(vendorId));

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
    setVendorId('');
    setAddingVendor(null);
    setVendorQuery('');
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
          /*
           * Opened from a milestone's Record button, so the money is aimed at
           * that milestone rather than left to the waterfall.
           *
           * Without this the server falls back to filling milestones in order
           * and spilling over, which is right for an untargeted receipt and
           * wrong here: a payment recorded against milestone 4 landed on
           * milestone 2 because 1 was already settled. The row said one thing
           * and the ledger did another, and the operator had no way to see it
           * until they went looking at the schedule afterwards.
           *
           * Only the portion up to that milestone's own balance is aimed at
           * it. Anything beyond is left unallocated so the server can spill it
           * the usual way — pinning the whole amount to one milestone would
           * over-allocate it, and the operator is allowed to record a payment
           * larger than the term it came in for.
           */
          allocations: forMilestone
            ? [
                {
                  milestoneId: forMilestone.milestoneId,
                  amountPaise: Math.min(amountPaise, forMilestone.balancePaise),
                },
              ]
            : undefined,
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
        vendorId: vendorId || undefined,
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
            : onCredit
              ? 'No cash leaves now. This becomes a payable you settle later.'
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
            onBlur={(e) => {
              if (blurStayedInDialog(e)) setAmountTouched(true);
            }}
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
            onChange={(e) => setMethod(String(e.target.value) as PaymentMethod)}
            /*
             * Credit is hidden entirely on the receipt side, not just
             * relabelled: money cannot be RECEIVED on credit — that is a
             * receivable, and it already has a home in payment_milestones —
             * so offering it here would be a trap. `credit` still joins this
             * list automatically for an expense since it maps
             * `Object.values(PaymentMethod)`, and says what it means there.
             * The rest use the app's method labels: upper-casing the raw value
             * showed "DEMAND_DRAFT" and shouted "ONLINE", "CASH", "CHEQUE".
             */
            options={Object.values(PaymentMethod)
              .filter((m) => !isReceipt || m !== PaymentMethod.CREDIT)
              .map((m) => ({
                value: m,
                label: m === PaymentMethod.CREDIT ? 'Credit (pay later)' : formatPaymentMethod(m),
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
              <VendorPickerControlled
                value={vendorId}
                onChange={handleVendorChange}
                inputValue={vendorQuery}
                onInputChange={setVendorQuery}
                label="Vendor"
                required={onCredit}
                placeholder="Search vendors"
                error={
                  onCredit && !vendorId ? 'A credit bill has to be owed to someone.' : undefined
                }
                options={vendorOptions}
                loading={vendorsLoading}
                onCreateNew={setAddingVendor}
              />
              {/* The full vendor form from Inventory — every field and every
                  check — saving to the same vendors table. Only the code may be
                  left blank here (the server assigns VEN-####), and a name
                  already on file is refused rather than added twice. */}
              <VendorFormDialog
                open={addingVendor !== null}
                onOpenChange={(next) => {
                  if (next) return;
                  setAddingVendor(null);
                  setVendorQuery('');
                }}
                initialName={addingVendor ?? ''}
                gate="finance.payments.record"
                autoCode
                refuseDuplicateName
                onCreated={(v) => {
                  setAddingVendor(null);
                  handleVendorChange(v.id);
                  setVendorQuery(v.code ? `${v.name} (${v.code})` : v.name);
                }}
              />
              <MUISelect
                fieldLabel="Category"
                value={category}
                disabled={pending || uploading}
                onChange={(e) => setCategory(String(e.target.value) as ExpenseCategory)}
                options={EXPENSE_CATEGORY_OPTIONS}
              />
              {/* Hidden once a vendor is chosen — see `handleVendorChange`.
                  Two fields naming the same party is how `labour` and
                  `labor` both reached this ledger. */}
              {!vendorId && (
                <MUIInput
                  fieldLabel="Paid to"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                />
              )}
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
            <AllocationPreview
              milestones={milestones}
              amountPaise={amountPaise}
              forMilestone={forMilestone}
            />
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
  forMilestone,
}: {
  milestones: MilestoneBalance[];
  amountPaise: number;
  /** Set when the dialog was opened from one milestone's Record button. */
  forMilestone?: MilestoneBalance | null;
}): JSX.Element {
  let remaining = amountPaise;
  const planned: Array<{ name: string; paise: number }> = [];

  /*
   * A targeted receipt takes its own milestone FIRST, then spills the rest down
   * the waterfall — mirroring exactly what submit() sends and what the server
   * then does with it.
   *
   * Simulating the plain waterfall here would put this preview back in the
   * position the bug came from: showing the money landing on milestone 2 while
   * it is actually aimed at milestone 4. A preview that disagrees with the
   * submission is worse than no preview.
   */
  if (forMilestone && forMilestone.balancePaise > 0) {
    const take = Math.min(remaining, forMilestone.balancePaise);
    planned.push({ name: forMilestone.name, paise: take });
    remaining -= take;
  }

  for (const m of milestones) {
    if (remaining <= 0) break;
    if (m.milestoneId === forMilestone?.milestoneId) continue;
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
