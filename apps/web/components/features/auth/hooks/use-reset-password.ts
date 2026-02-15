'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/auth.schema';

import { ROUTES, useRoutes } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export interface UseResetPasswordReturn {
  // State
  isLoading: boolean;
  isSuccess: boolean;
  displayError: string | null | undefined;
  passwordStrength: PasswordStrength;
  passwordsMatch: boolean;
  watchedPassword: string;
  watchedConfirm: string;

  // Form
  form: UseFormReturn<ResetPasswordFormData>;

  // Handlers
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
}

/**
 * Calculate password strength based on various criteria
 */
function getPasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: '', color: '' };

  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-error' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-warning' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-info' };
  return { score, label: 'Strong', color: 'bg-success' };
}

/**
 * useResetPassword Hook
 * Encapsulates all reset password form logic including:
 * - Form state management
 * - Password strength calculation
 * - Password match validation
 * - Token validation and redirect
 */
export function useResetPassword(): UseResetPasswordReturn {
  const { replace, getQueryParam } = useRoutes();
  const { resetPassword, isLoading, error, clearError, isAuthenticated, isInitialized } =
    useAuth();

  const token = getQueryParam('token') || '';
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  // Watch password for strength indicator
  const watchedPassword = form.watch('newPassword');
  const watchedConfirm = form.watch('confirmPassword');

  // Redirect if already authenticated or no token (client-side fallback)
  useEffect(() => {
    if (!isInitialized) return;

    // Priority 1: If already authenticated, redirect to home
    if (isAuthenticated) {
      replace(ROUTES.HOME);
      return;
    }

    // Priority 2: If no token provided, redirect to forgot-password
    if (!token) {
      replace(ROUTES.AUTH.FORGOT_PASSWORD);
    }
  }, [isAuthenticated, isInitialized, token, replace]);

  // Update token in form when it changes
  useEffect(() => {
    if (token) {
      form.setValue('token', token);
    }
  }, [token, form]);

  const handleFormSubmit = useCallback(
    async (data: ResetPasswordFormData) => {
      clearError();
      try {
        await resetPassword({ token: data.token, newPassword: data.newPassword });
        setIsSuccess(true);
      } catch {
        // Error handled by context
      }
    },
    [clearError, resetPassword],
  );

  const passwordStrength = getPasswordStrength(watchedPassword);
  const passwordsMatch = watchedPassword === watchedConfirm;
  const displayError =
    error ||
    form.formState.errors.newPassword?.message ||
    form.formState.errors.confirmPassword?.message;

  // Wrap handler to return void (not Promise) for form onSubmit compatibility
  const onSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      void form.handleSubmit(handleFormSubmit)(e);
    },
    [form, handleFormSubmit],
  );

  return {
    // State
    isLoading,
    isSuccess,
    displayError,
    passwordStrength,
    passwordsMatch,
    watchedPassword,
    watchedConfirm,

    // Form
    form,

    // Handlers
    onSubmit,
  };
}
