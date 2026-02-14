'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/auth.schema';

import { ROUTES, useRoutes } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

export interface UseForgotPasswordReturn {
  // State
  isLoading: boolean;
  isSuccess: boolean;
  submittedEmail: string;
  displayError: string | null | undefined;

  // Form
  form: UseFormReturn<ForgotPasswordFormData>;

  // Handlers
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
  handleResend: () => void;
}

/**
 * useForgotPassword Hook
 * Encapsulates all forgot password form logic including:
 * - Form state management
 * - Submit handler
 * - Success/error state
 * - Resend functionality
 */
export function useForgotPassword(): UseForgotPasswordReturn {
  const { replace } = useRoutes();
  const { forgotPassword, isLoading, error, clearError, isAuthenticated, isInitialized } =
    useAuth();

  // Redirect if already authenticated (client-side fallback)
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      replace(ROUTES.HOME);
    }
  }, [isAuthenticated, isInitialized, replace]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleFormSubmit = useCallback(
    async (data: ForgotPasswordFormData) => {
      clearError();
      try {
        await forgotPassword({ email: data.email });
        setSubmittedEmail(data.email);
        setIsSuccess(true);
      } catch {
        // Error handled by context
      }
    },
    [clearError, forgotPassword],
  );

  const handleResend = useCallback(async () => {
    setIsSuccess(false);
    clearError();
    try {
      await forgotPassword({ email: submittedEmail });
      setIsSuccess(true);
    } catch {
      // Error handled by context
    }
  }, [clearError, forgotPassword, submittedEmail]);

  const displayError = error || form.formState.errors.email?.message;

  // Wrap handlers to return void (not Promise) for form onSubmit compatibility
  const onSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      void form.handleSubmit(handleFormSubmit)(e);
    },
    [form, handleFormSubmit],
  );

  const onResend = useCallback(() => {
    void handleResend();
  }, [handleResend]);

  return {
    // State
    isLoading,
    isSuccess,
    submittedEmail,
    displayError,

    // Form
    form,

    // Handlers
    onSubmit,
    handleResend: onResend,
  };
}
