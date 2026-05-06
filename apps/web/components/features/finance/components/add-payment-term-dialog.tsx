'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';

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
import {
  type CreatePaymentTermPayload,
  usePaymentTermMutations,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

import {
  addPaymentTermSchema,
  type AddPaymentTermFormValues,
} from '../schemas/add-payment-term.schema';

interface AddPaymentTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddPaymentTermDialog({
  open,
  onOpenChange,
  projectId,
}: AddPaymentTermDialogProps): JSX.Element {
  const { create } = usePaymentTermMutations(projectId);

  const form = useForm<AddPaymentTermFormValues>({
    resolver: zodResolver(addPaymentTermSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      stage: undefined,
      expectedAmount: undefined as unknown as number,
      dueDate: undefined,
      notes: undefined,
    },
  });

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    AddPaymentTermFormValues,
    CreatePaymentTermPayload
  >({
    form,
    mutation: create,
    onOpenChange,
    transformPayload: (data) => ({
      name: data.name,
      expectedAmount: data.expectedAmount,
      stage: data.stage,
      dueDate: data.dueDate,
      notes: data.notes,
    }),
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose}>
      <MUIDialogHeader>
        <MUIDialogTitle>Add Payment Term</MUIDialogTitle>
        <MUIDialogDescription>
          Manual installments live alongside terms snapshotted from the quote. They will not be
          overwritten by a re-snapshot.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(create.error) && <Alert severity="error">{getErrorMessage(create.error)}</Alert>}

          <MUIInput
            id="term-name"
            fieldLabel="Name"
            required
            placeholder="e.g. Final Installment"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <MUIInput
              id="term-stage"
              fieldLabel="Stage"
              placeholder="Optional grouping label"
              error={form.formState.errors.stage?.message}
              {...form.register('stage')}
            />
            <MUIInput
              id="term-expected-amount"
              fieldLabel="Expected Amount (₹)"
              required
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              error={form.formState.errors.expectedAmount?.message}
              {...form.register('expectedAmount')}
            />
          </Box>

          <MUIInput
            id="term-due-date"
            fieldLabel="Due Date"
            type="date"
            error={form.formState.errors.dueDate?.message}
            {...form.register('dueDate')}
          />

          <MUIInput
            id="term-notes"
            fieldLabel="Notes"
            placeholder="Optional context for finance team"
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
              'Add Term'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
