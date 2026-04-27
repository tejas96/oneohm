'use client';

import { useCallback, useEffect, useState } from 'react';

import { ROUTES, useRoutes } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

const OTP_LENGTH = 6;
const RESEND_INTERVAL_SECONDS = 60;

export interface UseForgotPasswordOtpReturn {
  phone: string;
  maskedPhone: string;
  otp: string;
  setOtp: (value: string) => void;
  countdown: number;
  isVerifying: boolean;
  isResending: boolean;
  displayError: string | null | undefined;
  handleVerify: () => void;
  handleResend: () => void;
  otpLength: number;
}

export function useForgotPasswordOtp(): UseForgotPasswordOtpReturn {
  const { replace, getQueryParam } = useRoutes();
  const {
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    clearError,
    error,
    isAuthenticated,
    isInitialized,
  } = useAuth();

  const phone = getQueryParam('phone') || '';

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(RESEND_INTERVAL_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (isAuthenticated) {
      replace(ROUTES.HOME);
      return;
    }

    if (!phone) {
      replace(ROUTES.AUTH.FORGOT_PASSWORD);
    }
  }, [isAuthenticated, isInitialized, phone, replace]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const verifyOtp = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) {
      setFormError('Please enter all 6 digits');
      return;
    }

    setFormError(null);
    clearError();
    setIsVerifying(true);

    try {
      const response = await verifyPasswordResetOtp({ phone, otp });
      replace(ROUTES.AUTH.RESET_PASSWORD, undefined, {
        token: response.resetToken,
        maskedEmail: response.maskedEmail,
      });
    } catch {
      // error handled by auth provider
    } finally {
      setIsVerifying(false);
    }
  }, [clearError, otp, phone, replace, verifyPasswordResetOtp]);

  const resendOtp = useCallback(async () => {
    if (countdown > 0 || isResending) {
      return;
    }

    setFormError(null);
    clearError();
    setIsResending(true);

    try {
      await requestPasswordResetOtp({ phone });
      setOtp('');
      setCountdown(RESEND_INTERVAL_SECONDS);
    } catch {
      // error handled by auth provider
    } finally {
      setIsResending(false);
    }
  }, [clearError, countdown, isResending, phone, requestPasswordResetOtp]);

  return {
    phone,
    maskedPhone: maskPhone(phone),
    otp,
    setOtp,
    countdown,
    isVerifying,
    isResending,
    displayError: formError || error,
    handleVerify: () => void verifyOtp(),
    handleResend: () => void resendOtp(),
    otpLength: OTP_LENGTH,
  };
}

function maskPhone(phone: string): string {
  if (phone?.length !== 10) {
    return '+91';
  }

  return `+91 ${phone.slice(0, 2)}****${phone.slice(-4)}`;
}
