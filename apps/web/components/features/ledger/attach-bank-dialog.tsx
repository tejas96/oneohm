'use client';

import { Button, CircularProgress } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useRef, useState } from 'react';

import { BankSelect } from '@/components/features/shared/bank-select';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUITypography,
  showToast,
} from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { ledgerKeys } from '@/lib/hooks/resources/ledger';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils/error';
import { formatPaise } from '@/lib/utils/paise';

interface AttachBankDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  customerName: string;
  projectNumber: string;
  outstandingPaise: number;
  /** The bank on file now, if any — seeds the picker so reopening shows what was saved. */
  currentValue?: string | null;
}

/**
 * Attach a bank to a property, from the row where the gap was noticed.
 *
 * 149 of 153 loan properties have no bank on file, so a collector looking at
 * Recovery — Loan cannot tell which bank to call. Sending them to the property
 * edit wizard to fix one field loses their filters and their place in the list.
 *
 * Saves one field and nothing else. This deliberately does NOT split the bank's
 * share off the customer's: "who do I call" has one right answer per property,
 * "how much is theirs" has no safe default, and guessing 10/70/20 would silently
 * move money off a customer's name.
 */
export function AttachBankDialog({
  open,
  onClose,
  propertyId,
  customerName,
  projectNumber,
  outstandingPaise,
  currentValue,
}: AttachBankDialogProps): JSX.Element {
  const queryClient = useQueryClient();
  const [bank, setBank] = useState(currentValue ?? '');

  // Re-seed on every open, not once on mount — a bank saved from elsewhere
  // since this dialog was last open must not be clobbered by a stale value
  // left over in local state.
  useEffect(() => {
    if (open) setBank(currentValue ?? '');
  }, [open, currentValue]);

  // A ref, not state: two clicks in the same tick both read the pre-render
  // value of a state flag, so state cannot stop a double submission.
  const inFlight = useRef(false);

  const attachBank = useMutation({
    mutationFn: async (financingBank: string | null): Promise<void> => {
      // Send null, never undefined, to clear it — an absent key leaves the
      // column untouched instead of blanking it.
      await apiClient.patch(`/customer-properties/${propertyId}`, { financingBank });
    },
    onSuccess: () => {
      // The single root key for everything money — the Recovery — Loan row
      // this dialog was opened from reads through it, so the row updates in
      // place with no list reload and no lost filters.
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.root() });
      showToast.success('Bank attached');
      onClose();
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const handleSave = (): void => {
    if (inFlight.current) return;
    inFlight.current = true;
    attachBank.mutate(bank.trim() || null);
  };

  const save = useGatedAction('customers.edit', handleSave, 'Attach bank');

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="sm">
      <MUIDialogHeader>
        <MUIDialogTitle>Attach a bank</MUIDialogTitle>
        <MUIDialogDescription>
          Name the lender so the next person to open this row knows who to call.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg bg-background-secondary/50 p-3">
            <MUITypography variant="bodyPrimary" className="font-medium">
              {customerName}
            </MUITypography>
            <MUITypography variant="body" className="text-foreground-secondary">
              {projectNumber} · {formatPaise(outstandingPaise)} outstanding
            </MUITypography>
          </div>

          <BankSelect value={bank} onChange={setBank} disabled={attachBank.isPending} />
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={attachBank.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          disabled={attachBank.isPending}
          startIcon={attachBank.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Save
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
