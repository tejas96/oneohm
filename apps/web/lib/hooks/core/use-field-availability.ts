'use client';

import { useState, useCallback, useRef } from 'react';

import type { FieldAvailabilityConfig } from './types';

import { apiClient } from '@/lib/api/client';

interface UseFieldAvailabilityReturn {
  errors: Record<string, string | null>;
  isChecking: Record<string, boolean>;
  checkField: (field: string, value: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
  isAnyChecking: boolean;
}

export function useFieldAvailability(
  config: FieldAvailabilityConfig,
  excludeId?: string,
): UseFieldAvailabilityReturn {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isChecking, setIsChecking] = useState<Record<string, boolean>>({});
  const abortRefs = useRef<Record<string, AbortController>>({});

  const checkField = useCallback(
    (field: string, value: string) => {
      abortRefs.current[field]?.abort();

      if (!value || value.length < 3) {
        setErrors((prev) => ({ ...prev, [field]: null }));
        return;
      }

      const controller = new AbortController();
      abortRefs.current[field] = controller;

      setIsChecking((prev) => ({ ...prev, [field]: true }));
      void apiClient
        .get(
          `${config.endpoint}?${new URLSearchParams({ [field]: value, ...(excludeId && config.excludeIdParam ? { [config.excludeIdParam]: excludeId } : {}), ...(config.extraParams || {}) }).toString()}`,
          {
            signal: controller.signal,
          },
        )
        .then((response) => {
          if (config.validateResponse) {
            const errorMsg = config.validateResponse(field, response.data);
            setErrors((prev) => ({ ...prev, [field]: errorMsg }));
          } else {
            setErrors((prev) => ({ ...prev, [field]: null }));
          }
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name === 'CanceledError') return;
          const data = (err as { response?: { data?: { message?: string } } }).response?.data;
          setErrors((prev) => ({
            ...prev,
            [field]: data?.message || `${field} is already in use`,
          }));
        })
        .finally(() => {
          setIsChecking((prev) => ({ ...prev, [field]: false }));
        });
    },
    [
      config.endpoint,
      excludeId,
      config.excludeIdParam,
      config.extraParams,
      config.validateResponse,
    ],
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  return {
    errors,
    isChecking,
    checkField,
    clearErrors,
    hasErrors: Object.values(errors).some(Boolean),
    isAnyChecking: Object.values(isChecking).some(Boolean),
  };
}
