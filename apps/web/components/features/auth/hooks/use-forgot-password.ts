'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import {
  forgotPasswordByPhoneSchema,
  type ForgotPasswordByPhoneFormData,
} from '../schemas/auth.schema';

import { ROUTES, useRoutes } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

export interface UseForgotPasswordReturn {
  isLoading: boolean;
  displayError: string | null | undefined;
  form: UseFormReturn<ForgotPasswordByPhoneFormData>;
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
}

/**
 * useForgotPassword Hook
 * Handles phone-based forgot password OTP request and redirect flow.
 */
export function useForgotPassword(): UseForgotPasswordReturn {
  const { replace } = useRoutes();
  const { requestPasswordResetOtp, isLoading, error, clearError, isAuthenticated, isInitialized } =
    useAuth();

  // Redirect if already authenticated (client-side fallback)
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      replace(ROUTES.HOME);
    }
  }, [isAuthenticated, isInitialized, replace]);
  const form = useForm<ForgotPasswordByPhoneFormData>({
    resolver: zodResolver(forgotPasswordByPhoneSchema),
    defaultValues: { phone: '' },
  });

  const handleFormSubmit = useCallback(
    async (data: ForgotPasswordByPhoneFormData) => {
      clearError();
      try {
        await requestPasswordResetOtp({ phone: data.phone });
        replace(ROUTES.AUTH.FORGOT_PASSWORD_VERIFY_OTP, undefined, { phone: data.phone });
      } catch {
        // Error handled by context
      }
    },
    [clearError, replace, requestPasswordResetOtp],
  );

  const displayError = error || form.formState.errors.phone?.message;

  // Wrap handlers to return void (not Promise) for form onSubmit compatibility
  const onSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      void form.handleSubmit(handleFormSubmit)(e);
    },
    [form, handleFormSubmit],
  );

  return {
    isLoading,
    displayError,
    form,
    onSubmit,
  };
}
