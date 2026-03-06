'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils/error';

interface UseModalFormOptions<TForm extends Record<string, unknown>, TPayload = TForm> {
  form: UseFormReturn<TForm>;
  mutation: UseMutationResult<unknown, unknown, TPayload>;
  transformPayload?: (data: TForm) => TPayload;
  successMessage?: string;
  onSuccess?: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useModalForm<TForm extends Record<string, unknown>, TPayload = TForm>({
  form,
  mutation,
  transformPayload,
  successMessage,
  onSuccess,
  onOpenChange,
}: UseModalFormOptions<TForm, TPayload>) {
  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      onOpenChange(open);
    },
    [form, onOpenChange],
  );

  const onSubmit = useCallback(
    async (data: TForm) => {
      try {
        const payload = transformPayload ? transformPayload(data) : (data as unknown as TPayload);
        await mutation.mutateAsync(payload);
        if (successMessage) showToast.success(successMessage);
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        showToast.error(getErrorMessage(err));
      }
    },
    [form, mutation, transformPayload, successMessage, onOpenChange, onSuccess],
  );

  const handleSubmit = form.handleSubmit(onSubmit);

  return {
    handleSubmit,
    handleClose,
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
  };
}
