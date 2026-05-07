'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';

import {
  waivePaymentTermSchema,
  type WaivePaymentTermFormValues,
} from '../schemas/waive-payment-term.schema';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { type PaymentTerm, usePaymentTermMutations } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface WavePaymentTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  term: PaymentTerm | null;
}

export function WaivePaymentTermDialog({
  open,
  onOpenChange,
  projectId,
  term,
}: WavePaymentTermDialogProps): JSX.Element | null {
  const { waive } = usePaymentTermMutations(projectId);

  const form = useForm<WaivePaymentTermFormValues>({
    resolver: zodResolver(waivePaymentTermSchema),
    mode: 'onChange',
    defaultValues: { reason: '' },
  });

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    WaivePaymentTermFormValues,
    { id: string; reason: string }
  >({
    form,
    mutation: waive,
    onOpenChange,
    transformPayload: (data) => ({ id: term?.id ?? '', reason: data.reason }),
  });

  if (!term) return null;

  return (
    <MUIDialog open={open} onOpenChange={handleClose}>
      <MUIDialogHeader>
        <MUIDialogTitle>Waive “{term.name}”</MUIDialogTitle>
        <MUIDialogDescription>
          Waiving marks the term as not collectable. It will be excluded from pending totals but
          retained in history. This action cannot be edited later.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(waive.error) && <Alert severity="error">{getErrorMessage(waive.error)}</Alert>}
          <MUIInput
            id="waive-reason"
            fieldLabel="Reason"
            required
            placeholder="e.g. Customer goodwill — accepted by management"
            multiline
            minRows={3}
            error={form.formState.errors.reason?.message}
            {...form.register('reason')}
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="warning"
            variant="contained"
            disabled={isSubmitting || !form.formState.isValid}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                Waiving...
              </Box>
            ) : (
              'Waive Term'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
