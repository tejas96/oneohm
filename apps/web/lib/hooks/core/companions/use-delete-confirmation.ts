'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils/error';

interface UseDeleteConfirmationOptions<T> {
  mutation: UseMutationResult<unknown, unknown, string>;
  getId: (item: T) => string;
  entityName: string;
  onSuccess?: () => void;
}

export function useDeleteConfirmation<T>({
  mutation,
  getId,
  entityName,
  onSuccess,
}: UseDeleteConfirmationOptions<T>) {
  const [target, setTarget] = useState<T | null>(null);

  const confirm = useCallback(async () => {
    if (!target) return;
    try {
      await mutation.mutateAsync(getId(target));
      showToast.success(`${entityName} deleted successfully`);
      setTarget(null);
      onSuccess?.();
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  }, [target, mutation, getId, entityName, onSuccess]);

  const cancel = useCallback(() => setTarget(null), []);

  return {
    target,
    isOpen: target !== null,
    isPending: mutation.isPending,
    requestDelete: setTarget,
    confirm,
    cancel,
  };
}
