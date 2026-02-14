'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import {
  loginSchema,
  otpRequestSchema,
  type LoginFormData,
  type OtpRequestFormData,
} from '../schemas/auth.schema';

import { useAuth } from '@/providers/auth-provider';

export interface UseLoginFormReturn {
  // State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  displayError: string | null | undefined;

  // Forms
  passwordForm: UseFormReturn<LoginFormData>;
  otpForm: UseFormReturn<OtpRequestFormData>;

  // Handlers
  onPasswordSubmit: (e?: React.BaseSyntheticEvent) => void;
  onOtpSubmit: (e?: React.BaseSyntheticEvent) => void;
}

/**
 * useLoginForm Hook
 * Encapsulates all login form logic including:
 * - Form state management (password & OTP forms)
 * - Tab switching
 * - Form submission handlers
 * - Authentication redirect
 */
export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, requestOtp, isLoading, error, clearError, isAuthenticated, isInitialized } =
    useAuth();

  const [activeTab, setActiveTab] = useState<string>('password');

  // Password form
  const passwordForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // OTP form
  const otpForm = useForm<OtpRequestFormData>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { phone: '' },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const redirectTo = searchParams.get('redirect') || '/';
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isInitialized, router, searchParams]);

  // Clear errors when switching tabs
  useEffect(() => {
    clearError();
    passwordForm.clearErrors();
    otpForm.clearErrors();
  }, [activeTab, clearError, passwordForm, otpForm]);

  const handlePasswordSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        await login({ email: data.email, password: data.password });
      } catch {
        // Error handled by context
      }
    },
    [login],
  );

  const handleOtpSubmit = useCallback(
    async (data: OtpRequestFormData) => {
      const formattedPhone = `+91${data.phone}`;
      try {
        await requestOtp({ phone: formattedPhone });
        router.push(`/otp-verify?phone=${encodeURIComponent(formattedPhone)}`);
      } catch {
        // Error handled by context
      }
    },
    [requestOtp, router],
  );

  const displayError =
    error ||
    passwordForm.formState.errors.root?.message ||
    otpForm.formState.errors.root?.message;

  // Wrap handlers to return void (not Promise) for form onSubmit compatibility
  const onPasswordSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      void passwordForm.handleSubmit(handlePasswordSubmit)(e);
    },
    [passwordForm, handlePasswordSubmit],
  );

  const onOtpSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      void otpForm.handleSubmit(handleOtpSubmit)(e);
    },
    [otpForm, handleOtpSubmit],
  );

  return {
    // State
    activeTab,
    setActiveTab,
    isLoading,
    displayError,

    // Forms
    passwordForm,
    otpForm,

    // Handlers
    onPasswordSubmit,
    onOtpSubmit,
  };
}
