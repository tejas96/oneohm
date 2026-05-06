'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, CircularProgress, type SelectChangeEvent } from '@mui/material';
import { PaymentMethod, PaymentTermStatus } from '@oneohm-epc/shared/types';
import { type JSX, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

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
import { useModalForm } from '@/lib/hooks/core';
import {
  type CreateReceiptPayload,
  type PaymentTerm,
  useReceiptMutations,
} from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils';

import {
  recordReceiptSchema,
  type RecordReceiptFormValues,
} from '../schemas/record-receipt.schema';

interface RecordReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Pre-selects a term in the picker. Falls back to "advance" when null. */
  defaultTermId?: string | null;
  /** Outstanding terms to populate the picker. Pass [] when terms are still loading. */
  terms: PaymentTerm[];
}

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: PaymentMethod.UPI, label: 'UPI' },
  { value: PaymentMethod.NEFT, label: 'NEFT' },
  { value: PaymentMethod.RTGS, label: 'RTGS' },
  { value: PaymentMethod.IMPS, label: 'IMPS' },
  { value: PaymentMethod.CHEQUE, label: 'Cheque' },
  { value: PaymentMethod.DEMAND_DRAFT, label: 'Demand Draft' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.ONLINE, label: 'Online (other)' },
];

export function RecordReceiptDialog({
  open,
  onOpenChange,
  projectId,
  defaultTermId,
  terms,
}: RecordReceiptDialogProps): JSX.Element {
  const { create } = useReceiptMutations(projectId);

  /**
   * Picker shows only terms that can still receive money — paid/waived/
   * cancelled terms are filtered out so users can't accidentally over-pay.
   * The currently-selected term (if pre-filled from a row action) is
   * always included even when fully paid, so the dialog never appears
   * to "lose" its context.
   */
  const termOptions = useMemo(() => {
    const eligible = terms.filter(
      (t) =>
        t.status === PaymentTermStatus.PENDING ||
        t.status === PaymentTermStatus.PARTIAL ||
        t.id === defaultTermId,
    );
    return [
      { value: '', label: 'Advance / unallocated' },
      ...eligible.map((t) => {
        const remaining = Math.max(0, Number(t.expectedAmount) - Number(t.paidAmount));
        return {
          value: t.id,
          label: `${t.name} • ${formatCurrency(remaining)} remaining`,
        };
      }),
    ];
  }, [terms, defaultTermId]);

  const form = useForm<RecordReceiptFormValues>({
    resolver: zodResolver(recordReceiptSchema),
    mode: 'onChange',
    defaultValues: {
      paymentTermId: defaultTermId ?? undefined,
      paidAmount: undefined as unknown as number,
      paymentMethod: PaymentMethod.UPI,
      paidAt: undefined,
      paymentReference: undefined,
      bankName: undefined,
      accountNumber: undefined,
      ifscCode: undefined,
      notes: undefined,
    },
  });

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    RecordReceiptFormValues,
    CreateReceiptPayload
  >({
    form,
    mutation: create,
    onOpenChange,
    transformPayload: (data) => ({
      projectId,
      paymentTermId: data.paymentTermId,
      paidAmount: data.paidAmount,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt,
      paymentReference: data.paymentReference,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      ifscCode: data.ifscCode,
      notes: data.notes,
    }),
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Record Receipt</MUIDialogTitle>
        <MUIDialogDescription>
          Money received against this project. Linking a term updates its paid amount and status
          atomically.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(create.error) && <Alert severity="error">{getErrorMessage(create.error)}</Alert>}

          <Controller
            name="paymentTermId"
            control={form.control}
            render={({ field }) => (
              <MUISelect
                fieldLabel="Apply To Term"
                value={field.value ?? ''}
                onChange={(event: SelectChangeEvent<unknown>) =>
                  field.onChange((event.target.value as string) || undefined)
                }
                options={termOptions}
                placeholder="Advance / unallocated"
                error={form.formState.errors.paymentTermId?.message}
              />
            )}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <MUIInput
              id="receipt-amount"
              fieldLabel="Amount Received (₹)"
              required
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              error={form.formState.errors.paidAmount?.message}
              {...form.register('paidAmount')}
            />
            <Controller
              name="paymentMethod"
              control={form.control}
              render={({ field }) => (
                <MUISelect
                  fieldLabel="Method"
                  required
                  value={field.value}
                  onChange={(event: SelectChangeEvent<unknown>) =>
                    field.onChange(event.target.value as PaymentMethod)
                  }
                  options={PAYMENT_METHOD_OPTIONS}
                  error={form.formState.errors.paymentMethod?.message}
                />
              )}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <MUIInput
              id="receipt-date"
              fieldLabel="Receipt Date"
              type="date"
              error={form.formState.errors.paidAt?.message}
              {...form.register('paidAt')}
            />
            <MUIInput
              id="receipt-reference"
              fieldLabel="Reference (UTR / UPI ID / Cheque #)"
              placeholder="Reference for audit trail"
              error={form.formState.errors.paymentReference?.message}
              {...form.register('paymentReference')}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            <MUIInput
              id="receipt-bank"
              fieldLabel="Bank"
              placeholder="Optional"
              error={form.formState.errors.bankName?.message}
              {...form.register('bankName')}
            />
            <MUIInput
              id="receipt-account"
              fieldLabel="Account #"
              placeholder="Last 4 digits OK"
              error={form.formState.errors.accountNumber?.message}
              {...form.register('accountNumber')}
            />
            <MUIInput
              id="receipt-ifsc"
              fieldLabel="IFSC"
              placeholder="Optional"
              error={form.formState.errors.ifscCode?.message}
              {...form.register('ifscCode')}
            />
          </Box>

          <MUIInput
            id="receipt-notes"
            fieldLabel="Notes"
            placeholder="Optional context"
            multiline
            minRows={2}
            error={form.formState.errors.notes?.message}
            {...form.register('notes')}
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !form.formState.isValid}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                Saving...
              </Box>
            ) : (
              'Record Receipt'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
