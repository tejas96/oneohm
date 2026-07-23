'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

interface UseModalFormOptions<
  TForm extends FieldValues,
  TPayload = TForm,
  TTransformedValues extends FieldValues = TForm,
> {
  form: UseFormReturn<TForm, unknown, TTransformedValues>;
  mutation: UseMutationResult<unknown, unknown, TPayload>;
  transformPayload?: (data: TTransformedValues) => TPayload;
  onSuccess?: () => void;
  onOpenChange: (open: boolean) => void;
}

interface UseModalFormReturn<TForm extends FieldValues> {
  handleSubmit: ReturnType<UseFormReturn<TForm>['handleSubmit']>;
  handleClose: (open: boolean) => void;
  isSubmitting: boolean;
  isError: boolean;
}

export class FormTransformError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'FormTransformError';
  }
}

export function useModalForm<
  TForm extends FieldValues,
  TPayload = TForm,
  TTransformedValues extends FieldValues = TForm,
>({
  form,
  mutation,
  transformPayload,
  onSuccess,
  onOpenChange,
}: UseModalFormOptions<TForm, TPayload, TTransformedValues>): UseModalFormReturn<TForm> {
  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      onOpenChange(open);
    },
    [form, onOpenChange],
  );

  const onSubmit = useCallback(
    async (data: TTransformedValues) => {
      try {
        const payload = transformPayload ? transformPayload(data) : (data as unknown as TPayload);
        await mutation.mutateAsync(payload);
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        if (error instanceof FormTransformError) {
          form.setError(error.field as Parameters<typeof form.setError>[0], {
            type: 'manual',
            message: error.message,
          });
          return;
        }
        // Toast handled by useResourceMutations toast config
      }
    },
    [form, mutation, transformPayload, onOpenChange, onSuccess],
  );

  const handleSubmit = form.handleSubmit(onSubmit);

  return {
    handleSubmit,
    handleClose,
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
  };
}
