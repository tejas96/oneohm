'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

interface UseDeleteConfirmationOptions<T> {
  mutation: UseMutationResult<unknown, unknown, string>;
  getId: (item: T) => string;
  /** @deprecated No longer used — kept for backward compatibility */
  entityName?: string;
  onSuccess?: () => void;
}

export function useDeleteConfirmation<T>({
  mutation,
  getId,
  onSuccess,
}: UseDeleteConfirmationOptions<T>) {
  const [target, setTarget] = useState<T | null>(null);

  const confirm = useCallback(async () => {
    if (!target) return;
    try {
      await mutation.mutateAsync(getId(target));
      setTarget(null);
      onSuccess?.();
    } catch {
      // Toast handled by useResourceMutations toast config
    }
  }, [target, mutation, getId, onSuccess]);

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
