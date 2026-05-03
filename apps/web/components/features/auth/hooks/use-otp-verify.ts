'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ROUTES, useRoutes } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export interface UseOtpVerifyReturn {
  // State
  phone: string;
  formattedPhone: string;
  otp: string;
  setOtp: (value: string) => void;
  isLoading: boolean;
  isResending: boolean;
  isSuccess: boolean;
  displayError: string | null | undefined;
  resendCooldown: number;

  // Handlers
  handleSubmit: (otpValue: string) => void;
  handleResend: () => Promise<void>;

  // Constants
  OTP_LENGTH: number;
}

/**
 * useOtpVerify Hook
 * Encapsulates all OTP verification logic including:
 * - OTP state management
 * - Resend cooldown timer
 * - Form submission
 * - Authentication redirect
 */
export function useOtpVerify(): UseOtpVerifyReturn {
  const { replace, getQueryParam } = useRoutes();
  const { verifyOtp, requestOtp, isLoading, error, clearError, isInitialized } = useAuth();

  const phone = getQueryParam('phone') || '';
  const hasCheckedMissingPhoneRef = useRef(false);

  const [otp, setOtp] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Wait for initialization before deciding whether the OTP route has enough context.
  useEffect(() => {
    if (!isInitialized) return;

    // If no phone provided on initial mount, redirect to login.
    // Use ref to only check this once, preventing redirect during form interaction
    if (!phone && !hasCheckedMissingPhoneRef.current) {
      hasCheckedMissingPhoneRef.current = true;
      replace(ROUTES.AUTH.LOGIN);
    }
  }, [isInitialized, phone, replace]);

  // Start cooldown on mount
  useEffect(() => {
    setResendCooldown(RESEND_COOLDOWN);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handleSubmit = useCallback(
    async (otpValue: string) => {
      if (otpValue.length !== OTP_LENGTH) {
        setFormError('Please enter all 6 digits');
        return;
      }

      setFormError(null);
      clearError();

      try {
        await verifyOtp({ phone, otp: otpValue });
        setIsSuccess(true);
        replace(ROUTES.HOME);
      } catch {
        // Error is already set in context by verifyOtp, no need to re-throw
        // displayError will show it from the context
      }
    },
    [phone, replace, verifyOtp, clearError],
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setFormError(null);
    clearError();

    try {
      await requestOtp({ phone });
      setResendCooldown(RESEND_COOLDOWN);
      setOtp('');
    } catch {
      // Error handled by context
    } finally {
      setIsResending(false);
    }
  }, [resendCooldown, isResending, clearError, requestOtp, phone]);

  const formattedPhone = phone ? `${phone.slice(0, 3)} ••••• ${phone.slice(-4)}` : '';
  const displayError = formError || error;

  return {
    // State
    phone,
    formattedPhone,
    otp,
    setOtp,
    isLoading,
    isResending,
    isSuccess,
    displayError,
    resendCooldown,

    // Handlers
    handleSubmit: (otpValue: string) => void handleSubmit(otpValue),
    handleResend,

    // Constants
    OTP_LENGTH,
  };
}
