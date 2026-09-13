'use client';

import { Alert, Button, CircularProgress } from '@mui/material';
import { PaymentMethod } from '@tejas96/shared/types';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';

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
import { useResourceList, type BaseFilters } from '@/lib/hooks/core';
import { useLedgerMutations, type PayableRow } from '@/lib/hooks/resources/ledger';
import { useGatedAction } from '@/lib/rbac';
import { formatPaise, paiseToRupees, parseRupeeInput, rupeeInputError } from '@/lib/utils/paise';

export interface PayVendorDialogProps {
  open: boolean;
  onClose: () => void;
  vendor: PayableRow;
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
 * Every `PaymentMethod` `RecordMoneyDialog` offers on its expense side, minus
 * Credit.
 *
 * Settling a credit bill with more credit is not a payment — it is the same
 * bill, unpaid, restated. `LedgerWriteService.recordVendorPayment` refuses
 * `paymentMethod: 'credit'` outright (`BadRequestException`, "Settling a
 * credit bill with more credit is not a payment"), so leaving it off this list
 * means the operator never reaches that rejection in the first place.
 */
const METHOD_OPTIONS = Object.values(PaymentMethod)
  .filter((m) => m !== PaymentMethod.CREDIT)
  .map((m) => ({ value: m, label: m.toUpperCase() }));

interface ProjectPick {
  id: string;
  name: string;
  projectNumber?: string;
}

interface ProjectOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

const toOption = (p: ProjectPick): ProjectOption => ({
  value: p.id,
  label: p.projectNumber ? `${p.projectNumber} — ${p.name}` : p.name,
});

/**
 * Settle what we owe a vendor.
 *
 * The project picker is required and is not an accident of the schema: every
 * ledger entry belongs to a project, so one cheque covering three projects is
 * three lines. Saying that in the dialog is cheaper than a support call.
 *
 * Paying more than the balance is allowed. A vendor advance is ordinary in this
 * trade, and refusing it would push people into recording a false amount.
 */
export function PayVendorDialog({ open, onClose, vendor }: PayVendorDialogProps): JSX.Element {
  const save = useGatedAction('finance.payments.record', () => undefined, 'Pay vendor');

  /*
   * The shape problem: `useLedgerMutations` takes a `projectId` at hook level,
   * but in THIS dialog the project is picked by the operator, inside it — there
   * is no `projectId` prop to hand the hook up front. A hook cannot be called
   * conditionally or after a state change in the usual way, so the fix is not
   * to defer the call but to feed it live state: `projectId` lives here, and
   * `useLedgerMutations(projectId)` below is called unconditionally on every
   * render, empty string or not.
   *
   * That is sufficient, not a workaround. Each render's call creates a fresh
   * `useMutation` whose `mutationFn` closes over THAT render's `projectId`, and
   * react-query re-syncs the mutation observer's options on every render —
   * so whichever project id is current when `submit` (a plain function defined
   * fresh below on every render, not memoised with `useCallback`) actually
   * runs is the one the POST goes to. Picking a project and clicking Pay are
   * two separate user actions, never inside the same tick, so there is no
   * window in which a stale id could race a fresh one. Proved against the live
   * API in the task report: three vendor-payment POSTs, the same vendor sent
   * to two DIFFERENT `:projectId` URLs, each landed a pending row stamped with
   * that exact project id and no other — confirmed in both the response body
   * and a direct `pending_ledger_entries` query. Nothing about the endpoint
   * treats one project id differently from another, so this generalises.
   */
  const [projectId, setProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [projectQuery, setProjectQuery] = useState('');

  const { recordVendorPayment } = useLedgerMutations(projectId);

  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [valueDate, setValueDate] = useState(todayIst());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  /*
   * Search-as-you-type, the same house pattern `VendorPickerControlled` uses
   * for vendors in `RecordMoneyDialog`: `useResourceList` with `syncToUrl:
   * false`, so a dialog picker never writes its query into the URL. Gated on
   * `open` — unlike that vendor list, nothing here forces an unconditional
   * fetch, so there is no reason to search projects while this dialog is not
   * even on screen.
   */
  const {
    items: projectItems,
    isFetching: projectsLoading,
    setSearch: setProjectSearch,
  } = useResourceList<ProjectPick, BaseFilters>(
    { resource: 'projects', endpoint: '/projects', defaultPageSize: 25, syncToUrl: false },
    { enabled: open },
  );

  useEffect(() => {
    setProjectSearch(projectQuery);
  }, [projectQuery, setProjectSearch]);

  const projectOptions = useMemo(() => projectItems.map(toOption), [projectItems]);

  /*
   * The balance this dialog is settling. `payablePaise` is signed — negative
   * means a standing advance — so the sign is read once, here, and every
   * branch below (the header's label, the amount default, the warning) works
   * off `isAdvance`/`owedPaise` rather than re-deriving it and risking an
   * `ABS()` that quietly picks the wrong label.
   */
  const isAdvance = vendor.payablePaise < 0;
  const owedPaise = Math.max(vendor.payablePaise, 0);

  /*
   * Re-seeds the amount every time this dialog opens, keyed on `owedPaise`
   * (derived from `vendor.payablePaise`, a primitive) rather than the `vendor`
   * object itself. `usePayables` — Task 14's caller — can refetch and hand
   * this dialog a new `PayableRow` reference for the SAME vendor while it
   * happens to still be open; keying the effect on the object would re-run it
   * on every such refetch and wipe an amount the operator is mid-typing.
   * Keying on the numeric balance instead only re-seeds when the dialog opens
   * fresh, or the balance itself genuinely changes — never on a reference
   * change alone.
   */
  useEffect(() => {
    if (!open) return;
    setAmount(paiseToRupees(owedPaise).toFixed(2));
  }, [open, owedPaise]);

  const pending = recordVendorPayment.isPending;
  // Same parser as `RecordMoneyDialog`: accepts "1,000", refuses text and
  // amounts past the point where paise stop being exact, and says which.
  const parsedAmount = parseRupeeInput(amount);
  const amountPaise = parsedAmount.ok ? parsedAmount.paise : 0;
  const showAmountError = amountTouched && !parsedAmount.ok;
  const showFutureDateError = valueDate > todayIst();

  // Paying more than the balance is allowed — see the module doc above. This
  // is the inline, non-blocking warning that says so; it never feeds `valid`.
  const overPaise = amountPaise - owedPaise;
  const showAdvanceWarning = parsedAmount.ok && overPaise > 0;

  const valid = parsedAmount.ok && valueDate <= todayIst() && Boolean(projectId);

  const reset = (): void => {
    setAmount('');
    setAmountTouched(false);
    setValueDate(todayIst());
    setProjectId('');
    setSelectedProject(null);
    setProjectQuery('');
    setMethod(PaymentMethod.UPI);
    setReference('');
    setNotes('');
  };

  // A ref, not state: two clicks in the same tick both read the pre-render
  // value of a state flag, so state cannot stop a double submission.
  const inFlight = useRef(false);

  const submit = async (): Promise<void> => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    try {
      await recordVendorPayment.mutateAsync({
        amountPaise,
        valueDate,
        vendorId: vendor.vendorId,
        paymentMethod: method,
        reference: reference || undefined,
        notes: notes || undefined,
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
        <MUIDialogTitle>Pay vendor</MUIDialogTitle>
        <MUIDialogDescription>
          Sent for verification, like any other payment out — the vendor&apos;s balance changes
          only once it&apos;s approved.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <Alert severity="info" variant="outlined">
            <div className="flex items-center justify-between gap-4">
              <MUITypography variant="bodyPrimary" component="span" fontWeight={600}>
                {vendor.vendorCode ? `${vendor.vendorName} (${vendor.vendorCode})` : vendor.vendorName}
              </MUITypography>
              <div className="flex flex-col items-end gap-0.5">
                <MUITypography variant="metaLabel" component="span">
                  {isAdvance ? 'Advance held' : 'Currently owed'}
                </MUITypography>
                <MUITypography
                  variant="bodyPrimary"
                  component="span"
                  fontWeight={600}
                  className="tabular-nums"
                >
                  {formatPaise(Math.abs(vendor.payablePaise))}
                </MUITypography>
              </div>
            </div>
          </Alert>

          <MUIInput
            fieldLabel="Amount (₹)"
            /* Not type="number" — see RecordMoneyDialog: that input rejects a
               comma before any handler sees it, and lets a scroll wheel over a
               focused field silently change an amount. inputMode keeps the
               numeric keypad on mobile; parseRupeeInput does the validating. */
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

          {showAdvanceWarning && (
            <Alert severity="warning" variant="outlined">
              <span className="text-sm">
                {formatPaise(overPaise)} more than we owe. The extra becomes an advance with this
                vendor.
              </span>
            </Alert>
          )}

          <MUIInput
            fieldLabel="Date paid"
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

          <div className="flex flex-col gap-1.5">
            <MUIInput
              mode="autocomplete"
              fieldLabel="Project"
              required
              options={projectOptions}
              value={selectedProject}
              onChange={(opt) => {
                const option =
                  opt && typeof opt === 'object' && 'value' in opt ? (opt as ProjectOption) : null;
                setSelectedProject(option);
                setProjectId(option ? String(option.value) : '');
              }}
              inputValue={projectQuery}
              onInputChange={setProjectQuery}
              loading={projectsLoading}
              textFieldProps={{ placeholder: 'Search projects' }}
              noOptionsText={projectQuery ? 'No matches' : 'Type to search'}
              filterOptions={(x) => x}
              isOptionEqualToValue={(a, b) => {
                const av = typeof a === 'object' && a !== null ? (a as ProjectOption).value : a;
                const bv = typeof b === 'object' && b !== null ? (b as ProjectOption).value : b;
                return av === bv;
              }}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : (option.label ?? String(option.value ?? ''))
              }
            />
            <MUITypography variant="finePrint" component="span">
              Every ledger entry belongs to a project. One cheque covering three projects is
              recorded as three lines.
            </MUITypography>
          </div>

          <MUISelect
            fieldLabel="Method"
            value={method}
            onChange={(e) => setMethod(String(e.target.value) as PaymentMethod)}
            options={METHOD_OPTIONS}
          />

          <MUIInput
            fieldLabel="Reference (UTR / cheque no.)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <MUIInput
            fieldLabel="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
          />
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={handleClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => (save.allowed ? void submit() : save.onGatedClick())}
          aria-disabled={!save.allowed}
          disabled={!valid || pending}
          startIcon={pending ? <CircularProgress size={16} /> : undefined}
        >
          Pay vendor
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
