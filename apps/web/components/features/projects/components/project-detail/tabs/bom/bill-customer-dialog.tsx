'use client';

import { Alert, Button, CircularProgress } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type JSX } from 'react';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { useLedgerMutations, useProjectLedger } from '@/lib/hooks/resources/ledger';
import { useGatedAction } from '@/lib/rbac';
import { formatCurrency, paiseToRupees, rupeesToPaise } from '@/lib/utils';

export interface BillCustomerDialogProps {
  projectId: string;
  /** `bom.totals.variancePaise` — pre-fills the amount below. */
  variancePaise: number;
  open: boolean;
  onClose: () => void;
}

/**
 * Raise a change order for material added after the quote.
 *
 * This is the ONLY path from a BOM change to customer debt, and it is always a
 * human decision: expenses never change what the customer owes, so a BOM edit
 * cannot move the contract by itself. The amount is pre-filled from the
 * variance and is editable — the company may absorb part of it.
 */
export function BillCustomerDialog({
  projectId,
  variancePaise,
  open,
  onClose,
}: BillCustomerDialogProps): JSX.Element {
  const queryClient = useQueryClient();
  const gate = useGatedAction('finance.payments.record', () => undefined, 'Bill customer');
  const { addChangeOrder } = useLedgerMutations(projectId);
  // Read-only context — what this adds on top of. Not the source of truth for
  // the mutation: `useLedgerMutations` already invalidates the ledger root on
  // success, which is what moves this number once the change order lands.
  const summary = useProjectLedger(projectId, { enabled: open });
  // Everything agreed after the quote was signed. `undefined` while the
  // summary is still in flight — the seeding effect below waits for it.
  const changeOrderPaise = summary.data?.changeOrderPaise;

  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  // Whether the amount has been seeded for THIS opening. A ref, not state:
  // seeding must happen exactly once per open, and re-rendering on it would
  // re-run the effect that reads it.
  const seeded = useRef(false);

  // Clear both fields on every open. A BOM edit made since this was last open
  // must not leave a stale suggestion sitting in the field.
  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    setReason('');
    setAmount('');
  }, [open]);

  /*
   * Billing does not change the BOM. That is deliberate — a change order moves
   * what the customer owes, the bill records what the project needs — and it is
   * why `variancePaise` still reads its full value after part of it has been
   * charged. This box used to re-offer that full variance on every open, so a
   * project already billed for most of its change silently proposed the whole
   * amount again: one description typed and the same material is charged twice.
   *
   * It now offers the remainder, and waits for the summary rather than guessing
   * while it loads. On a contract with nothing agreed since signing the two are
   * identical, so the first bill is unchanged.
   *
   * `changeOrderPaise` is everything agreed after signing, not only what was
   * raised from this button — the endpoint takes any amount for any reason. So
   * the remainder is a floor rather than an exact BOM figure, the panel above
   * says what is being subtracted and why the operator might disagree with it,
   * and the field stays editable.
   */
  useEffect(() => {
    if (!open || seeded.current || changeOrderPaise === undefined) return;
    seeded.current = true;
    // The UNBILLED remainder, not the whole variance. On a clean contract the
    // two are identical, so the first bill is unchanged. On one already billed
    // for part of its change, this is the only figure that does not charge the
    // same material twice — and it is exactly what the tab's own "not yet
    // billed" line beside the button says.
    const unbilled = variancePaise - changeOrderPaise;
    if (unbilled > 0) {
      setAmount(paiseToRupees(unbilled).toFixed(2));
    }
  }, [open, changeOrderPaise, variancePaise]);

  const amountPaise = amount ? rupeesToPaise(Number(amount)) : 0;
  const valid = reason.trim().length > 0 && amountPaise > 0;

  const submit = async (): Promise<void> => {
    if (!valid) return;
    try {
      await addChangeOrder.mutateAsync({ name: reason.trim(), amountPaise });
    } catch {
      // onError already toasts; keep the dialog and the operator's input so
      // they can retry rather than re-typing the reason.
      return;
    }
    // The mutation's own onSuccess invalidates the ledger root — the contract
    // total and milestone list. It knows nothing about the BOM tab, so the
    // query behind `variancePaise` and the totals header is this dialog's own
    // job to refresh.
    void queryClient.invalidateQueries({ queryKey: ['bom'] });
    onClose();
  };

  const contractPaise = summary.data?.contractPaise;

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Bill customer</MUIDialogTitle>
        <MUIDialogDescription>
          Raises a change order for material added after the quote. This is the only path from a
          BOM change to what the customer owes — expenses never move it on their own.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          {changeOrderPaise !== undefined && changeOrderPaise > 0 ? (
            <Alert severity="warning" variant="outlined">
              <div className="flex flex-col gap-1 text-sm">
                <span>
                  <span className="font-medium">
                    {formatCurrency(changeOrderPaise / 100)}
                  </span>{' '}
                  has already been agreed on this contract since the quote was signed.
                </span>
                <span className="text-xs">
                  The material change stays at its full value — billing never takes material
                  back off the project. The amount below is what remains unbilled against it;
                  check the Finance tab if any of those change orders were raised for something
                  other than material.
                </span>
              </div>
            </Alert>
          ) : null}

          <MUIInput
            fieldLabel="What's being billed"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. 2 additional panels added on site"
            multiline
            minRows={2}
            autoFocus
            inputProps={{ maxLength: 255 }}
          />

          <MUIInput
            fieldLabel="Amount to bill (₹)"
            required
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />

          {amountPaise > 0 && contractPaise != null ? (
            <Alert severity="info" variant="outlined">
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="flex justify-between gap-4">
                  <span>Current contract</span>
                  <span className="tabular-nums">{formatCurrency(contractPaise / 100)}</span>
                </span>
                <span className="flex justify-between gap-4">
                  <span>This change order</span>
                  <span className="tabular-nums">+{formatCurrency(amountPaise / 100)}</span>
                </span>
                <span className="mt-0.5 flex justify-between gap-4 border-t border-current/20 pt-1 font-medium">
                  <span>New contract total</span>
                  <span className="tabular-nums">
                    {formatCurrency((contractPaise + amountPaise) / 100)}
                  </span>
                </span>
              </div>
            </Alert>
          ) : null}

          <p className="text-xs text-muted-foreground">
            This changes what the customer owes, not the material plan — the BOM&apos;s own change
            log is unaffected by billing.
          </p>
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={addChangeOrder.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => (gate.allowed ? void submit() : gate.onGatedClick())}
          aria-disabled={!gate.allowed}
          disabled={!valid || addChangeOrder.isPending}
          startIcon={addChangeOrder.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Bill customer
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
