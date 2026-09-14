'use client';

import { Alert, Button, ButtonBase, CircularProgress } from '@mui/material';
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
import {
  useLedgerMutations,
  useVendorPayableProjects,
  type PayableRow,
  type VendorProjectPayable,
} from '@/lib/hooks/resources/ledger';
import { useGatedAction } from '@/lib/rbac';
import { color, radius } from '@/lib/theme/tokens';
import { blurStayedInDialog } from '@/lib/utils/focus';
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

const pickToOption = (pick: VendorProjectPayable): ProjectOption =>
  toOption({
    id: pick.projectId,
    name: pick.projectName ?? pick.projectNumber ?? pick.projectId,
    projectNumber: pick.projectNumber ?? undefined,
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
   * Where the balance sits, project by project. A payment is one project's
   * line, so the dialog offers those projects rather than the vendor's total:
   * recording the whole balance against one project would move cost between
   * projects even though the vendor's figure came out right.
   */
  const projectsOwed = useVendorPayableProjects(vendor.vendorId, { enabled: open });
  const picks = useMemo(() => projectsOwed.data?.data ?? [], [projectsOwed.data]);

  /*
   * The balance this dialog is settling. It comes back with the per-project
   * figures, so the two are read at the same moment; the row's copy is only a
   * stand-in until then — read when the list loaded, beside fresh project
   * figures it could invent a "paid ahead on other projects" gap. Signed:
   * negative is a standing advance, read once here as `isAdvance` rather than
   * re-derived with an `ABS()` that quietly picks the wrong label.
   */
  const payablePaise = projectsOwed.data?.vendorPayablePaise ?? vendor.payablePaise;
  const isAdvance = payablePaise < 0;

  /*
   * Projects paid ahead (payments above their bills) net the vendor's balance
   * down, so the picks can add up to more than the header. Say by how much,
   * rather than leave two figures that do not reconcile on screen.
   */
  const paidAheadElsewherePaise = picks.reduce((sum, p) => sum + p.owedPaise, 0) - payablePaise;

  const choosePick = (pick: VendorProjectPayable): void => {
    setSelectedProject(pickToOption(pick));
    setProjectId(pick.projectId);
    setAmount(paiseToRupees(pick.owedPaise).toFixed(2));
    setAmountTouched(false);
  };

  /*
   * Seeds once per open, when the per-project figures arrive — never again
   * while it stays open, so a background refetch cannot wipe what the operator
   * is typing. One owing project is picked for them. Several are left to pick:
   * any default would be a guess about which bill is being paid.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    if (seeded.current || !projectsOwed.isSuccess) return;
    seeded.current = true;
    const [only, ...rest] = picks;
    if (only && rest.length === 0) {
      setSelectedProject(pickToOption(only));
      setProjectId(only.projectId);
      setAmount(paiseToRupees(only.owedPaise).toFixed(2));
    }
  }, [open, projectsOwed.isSuccess, picks]);

  /** Vendor payments on the chosen project already queued for approval. */
  const waitingPaise = picks.find((p) => p.projectId === projectId)?.waitingPaise ?? 0;

  const pending = recordVendorPayment.isPending;
  // Same parser as `RecordMoneyDialog`: accepts "1,000", refuses text and
  // amounts past the point where paise stop being exact, and says which.
  const parsedAmount = parseRupeeInput(amount);
  const amountPaise = parsedAmount.ok ? parsedAmount.paise : 0;
  const showAmountError = amountTouched && !parsedAmount.ok;
  const showFutureDateError = valueDate > todayIst();

  // Paying more than is owed is allowed — see the module doc above. This is the
  // inline, non-blocking warning that says so; it never feeds `valid`. It is
  // measured against the chosen PROJECT, because the payment is recorded on
  // that project: against the vendor's total, ₹12,000 on a project owed
  // ₹10,000 passed silently while another project stayed owed, and the
  // suggested ₹1,000 on a project owed ₹1,000 warned because another project
  // held a ₹500 advance. A project not in the picks owes nothing.
  const owedOnProjectPaise = picks.find((p) => p.projectId === projectId)?.owedPaise ?? 0;
  const overPaise = amountPaise - owedOnProjectPaise;
  const showAdvanceWarning = parsedAmount.ok && Boolean(projectId) && overPaise > 0;

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
          Sent for verification, like any other payment out — the vendor&apos;s balance changes only
          once it&apos;s approved.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <Alert severity="info" variant="outlined">
            <div className="flex items-center justify-between gap-4">
              <MUITypography variant="bodyPrimary" component="span" fontWeight={600}>
                {vendor.vendorCode
                  ? `${vendor.vendorName} (${vendor.vendorCode})`
                  : vendor.vendorName}
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
                  {formatPaise(Math.abs(payablePaise))}
                </MUITypography>
              </div>
            </div>
          </Alert>

          {picks.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <MUITypography variant="metaLabel" component="span">
                Owed by project — pick one to fill project and amount
              </MUITypography>
              <div role="radiogroup" aria-label="Owed by project" className="flex flex-col gap-1">
                {picks.map((pick) => {
                  const selected = pick.projectId === projectId;
                  return (
                    <ButtonBase
                      key={pick.projectId}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => choosePick(pick)}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        px: 1.5,
                        py: 1,
                        textAlign: 'left',
                        borderRadius: radius['card-functional'],
                        border: `1px solid ${selected ? color.accent : color.divider}`,
                        backgroundColor: selected ? 'var(--ds-accent-subtle)' : undefined,
                      }}
                    >
                      <span className="flex min-w-0 flex-col">
                        <MUITypography variant="bodyPrimary" component="span" fontWeight={600}>
                          {pick.projectNumber ?? pick.projectName}
                        </MUITypography>
                        {pick.customerName ? (
                          <MUITypography variant="finePrint" component="span">
                            {pick.customerName}
                          </MUITypography>
                        ) : null}
                      </span>
                      <MUITypography
                        variant="bodyPrimary"
                        component="span"
                        fontWeight={600}
                        className="tabular-nums"
                      >
                        {formatPaise(pick.owedPaise)}
                      </MUITypography>
                    </ButtonBase>
                  );
                })}
              </div>
              {paidAheadElsewherePaise > 0 ? (
                <MUITypography variant="finePrint" component="span">
                  {formatPaise(paidAheadElsewherePaise)} was paid ahead on other projects, so the
                  balance above is lower than these add up to.
                </MUITypography>
              ) : null}
            </div>
          ) : null}

          {projectsOwed.isError ? (
            <Alert severity="warning" variant="outlined">
              <span className="text-sm">
                Could not load what this vendor is owed per project. Pick the project below.
              </span>
            </Alert>
          ) : null}

          <MUIInput
            fieldLabel="Amount (₹)"
            /* Not type="number" — see RecordMoneyDialog: that input rejects a
               comma before any handler sees it, and lets a scroll wheel over a
               focused field silently change an amount. inputMode keeps the
               numeric keypad on mobile; parseRupeeInput does the validating. */
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

          {waitingPaise > 0 ? (
            <Alert severity="warning" variant="outlined">
              <span className="text-sm">
                {formatPaise(waitingPaise)} to this vendor on this project is already waiting for
                approval. Check it is not this same payment.
              </span>
            </Alert>
          ) : null}

          {showAdvanceWarning && (
            <Alert severity="warning" variant="outlined">
              <span className="text-sm">
                {formatPaise(overPaise)} more than this project owes the vendor. The extra is
                recorded as paid ahead on this project.
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
