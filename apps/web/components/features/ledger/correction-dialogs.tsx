'use client';

import { Alert, Button, CircularProgress } from '@mui/material';
import { type JSX, useState } from 'react';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import {
  useLedgerMutations,
  type LedgerEntry,
  type MilestoneBalance,
} from '@/lib/hooks/resources/ledger';
import { formatPaise, rupeesToPaise } from '@/lib/utils/paise';
import { formatDate } from '@/lib/utils';

/**
 * Reverse an entry — a bounced cheque, or a wrong amount.
 *
 * Nothing is edited or deleted. A reversing entry is posted and both rows stay
 * on the record forever, which is what makes the ledger auditable. The wording
 * here is deliberate: an operator should understand they are adding a
 * correction, not erasing a mistake.
 */
export function ReverseEntryDialog({
  open,
  onClose,
  projectId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  entry: LedgerEntry;
}): JSX.Element {
  const { reverseEntry } = useLedgerMutations(projectId);
  const [reason, setReason] = useState('');

  // The mutation's onError already raises a toast, so nothing is swallowed here.
  // Without the catch the rejection escapes `void submit()` as an unhandled
  // promise rejection — a red overlay in dev and a silent console error in
  // production. The dialog deliberately stays open so the operator can retry or
  // cancel with their text intact.
  const submit = async (): Promise<void> => {
    if (!reason.trim()) return;
    try {
      await reverseEntry.mutateAsync({ entryId: entry.id, reason: reason.trim() });
    } catch {
      return;
    }
    setReason('');
    onClose();
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Reverse {entry.entryNo}</MUIDialogTitle>
        <MUIDialogDescription>
          {formatPaise(entry.amountPaise)} received {entry.valueDate}
          {entry.valueDateIsInferred ? ' (approx)' : ''}, recorded {formatDate(entry.createdAt)}
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <Alert severity="warning" variant="outlined">
            This does not delete anything. A reversing entry is added, and both this entry and the
            correction stay visible on the ledger permanently.
          </Alert>

          <MUIInput
            fieldLabel="Why is this being reversed?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cheque returned unpaid by bank"
            multiline
            minRows={2}
            autoFocus
          />
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={reverseEntry.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => void submit()}
          disabled={!reason.trim() || reverseEntry.isPending}
          startIcon={reverseEntry.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Post reversal
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

/**
 * A change order: extra scope the customer agreed to pay for.
 *
 * Free text and any amount — not restricted to BOM items. It adds a milestone
 * rather than a ledger entry, because a change order is not cash: the contract
 * total rises because the contract IS the sum of the milestones.
 *
 * Deliberately separate from recording an expense. Costs you absorb and scope
 * the customer agreed to fund are different things, and conflating them is how
 * margin quietly disappears.
 */
export function ChangeOrderDialog({
  open,
  onClose,
  projectId,
  currentContractPaise,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  currentContractPaise: number;
}): JSX.Element {
  const { addChangeOrder } = useLedgerMutations(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const amountPaise = amount ? rupeesToPaise(Number(amount)) : 0;
  const valid = name.trim().length > 0 && amountPaise > 0;

  const submit = async (): Promise<void> => {
    if (!valid) return;
    try {
      await addChangeOrder.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        amountPaise,
      });
    } catch {
      // onError toasts; keep the dialog and the operator's input.
      return;
    }
    setName('');
    setDescription('');
    setAmount('');
    onClose();
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Add change order</MUIDialogTitle>
        <MUIDialogDescription>
          Extra work the customer has agreed to pay for. This increases what they owe.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <MUIInput
            fieldLabel="What was added"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2 additional panels + extended cable run"
            autoFocus
          />

          <MUIInput
            fieldLabel="Details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
          />

          <MUIInput
            fieldLabel="Additional amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />

          {amountPaise > 0 && (
            <Alert severity="info" variant="outlined">
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="flex justify-between gap-4">
                  <span>Current contract</span>
                  <span className="tabular-nums">{formatPaise(currentContractPaise)}</span>
                </span>
                <span className="flex justify-between gap-4">
                  <span>This change order</span>
                  <span className="tabular-nums">+{formatPaise(amountPaise)}</span>
                </span>
                <span className="mt-0.5 flex justify-between gap-4 border-t border-current/20 pt-1 font-medium">
                  <span>New contract total</span>
                  <span className="tabular-nums">
                    {formatPaise(currentContractPaise + amountPaise)}
                  </span>
                </span>
              </div>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            If this is a cost you are absorbing rather than billing, record it as an expense instead
            — expenses never change what the customer owes.
          </p>
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={addChangeOrder.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!valid || addChangeOrder.isPending}
          startIcon={addChangeOrder.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Add change order
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}

/**
 * Waive a milestone — write off a residual nobody intends to collect.
 *
 * The milestone and its reason survive; only the expectation goes away. It stops
 * appearing in receivables and absorbs nothing when a later payment is recorded,
 * which is the behaviour the old model got wrong: the dashboard dropped a waived
 * amount while the project page kept chasing it forever.
 */
export function WaiveMilestoneDialog({
  open,
  onClose,
  projectId,
  milestone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  milestone: MilestoneBalance;
}): JSX.Element {
  const { waiveMilestone } = useLedgerMutations(projectId);
  const [reason, setReason] = useState('');

  const submit = async (): Promise<void> => {
    if (!reason.trim()) return;
    try {
      await waiveMilestone.mutateAsync({
        milestoneId: milestone.milestoneId,
        reason: reason.trim(),
      });
    } catch {
      // onError toasts; keep the dialog and the operator's input.
      return;
    }
    setReason('');
    onClose();
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Waive “{milestone.name}”</MUIDialogTitle>
        <MUIDialogDescription>
          {formatPaise(milestone.balancePaise)} is still outstanding on this milestone.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <Alert severity="info" variant="outlined">
            Waiving removes {formatPaise(milestone.balancePaise)} from what this customer owes. The
            milestone stays on the project marked <strong>Waived</strong>, and any payment already
            received against it is unaffected.
          </Alert>

          <MUIInput
            fieldLabel="Why is this being waived?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Residual written off by agreement with the customer"
            multiline
            minRows={2}
            autoFocus
          />
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={waiveMilestone.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => void submit()}
          disabled={!reason.trim() || waiveMilestone.isPending}
          startIcon={waiveMilestone.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Waive milestone
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
