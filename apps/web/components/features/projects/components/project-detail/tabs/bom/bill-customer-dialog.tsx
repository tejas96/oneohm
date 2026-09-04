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

  // Billing does not change the BOM — that is the whole point, and it is why
  // `variancePaise` still reads +₹3,385 after a ₹3,385 change order has been
  // raised. This dialog used to re-fill the amount box with that full variance
  // every single time it opened, so a project already billed in full silently
  // offered the identical amount again: one more description typed and the
  // customer is charged twice for the same material change.
  //
  // So the suggestion is now conditional, and it waits for the summary rather
  // than guessing while it loads: pre-fill only when nothing has been agreed
  // after signing yet. Once anything has, the box starts empty and the panel
  // below says what is already on the contract, making a second charge a
  // deliberate act instead of an accident.
  //
  // `changeOrderPaise` is everything agreed after signing, not only what was
  // billed from this tab — the change-order endpoint takes "free text and any
  // amount" and nothing links one back to the BOM. That is why the amount is
  // withheld and the total shown, rather than a remainder being computed: a
  // subtraction would be a guess, and a wrong one would block legitimate
  // billing.
  useEffect(() => {
    if (!open || seeded.current || changeOrderPaise === undefined) return;
    seeded.current = true;
    if (changeOrderPaise === 0 && variancePaise > 0) {
      setAmount(paiseToRupees(variancePaise).toFixed(2));
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
                  The material change below still reads its full value — billing never changes
                  the BOM. Check the Finance tab before charging again, and enter only what is
                  genuinely still unbilled.
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
