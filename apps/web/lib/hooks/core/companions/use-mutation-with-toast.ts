'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils/error';

interface MutationWithToastOptions<TData, TVariables> {
  mutation: UseMutationResult<TData, unknown, TVariables>;
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string;
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
}

export function useMutationWithToast<TData, TVariables>({
  mutation,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
}: MutationWithToastOptions<TData, TVariables>) {
  const execute = useCallback(
    async (variables: TVariables) => {
      try {
        const result = await mutation.mutateAsync(variables);
        const msg = typeof successMessage === 'function' ? successMessage(result) : successMessage;
        if (msg) showToast.success(msg);
        onSuccess?.(result);
        return result;
      } catch (err) {
        showToast.error(errorMessage || getErrorMessage(err));
        onError?.(err);
        throw err;
      }
    },
    [mutation, successMessage, errorMessage, onSuccess, onError],
  );

  return {
    execute,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
