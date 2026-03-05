'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '@/lib/api/client';

interface AvailabilityState {
  phoneError: string | null;
  emailError: string | null;
  isCheckingPhone: boolean;
  isCheckingEmail: boolean;
}

interface AvailabilityResponse {
  emailExists: boolean;
  phoneExists: boolean;
}

const DEBOUNCE_MS = 600;

export function useCheckUserAvailability() {
  const [state, setState] = useState<AvailabilityState>({
    phoneError: null,
    emailError: null,
    isCheckingPhone: false,
    isCheckingEmail: false,
  });

  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneAbortRef = useRef<AbortController | null>(null);
  const emailAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
      phoneAbortRef.current?.abort();
      emailAbortRef.current?.abort();
    };
  }, []);

  const checkPhone = useCallback((phone: string) => {
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    phoneAbortRef.current?.abort();

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      setState((prev) => ({ ...prev, phoneError: null, isCheckingPhone: false }));
      return;
    }

    setState((prev) => ({ ...prev, isCheckingPhone: true, phoneError: null }));

    phoneTimerRef.current = setTimeout(() => {
      const abortController = new AbortController();
      phoneAbortRef.current = abortController;

      void (async () => {
        try {
          const phoneWithCode = `+91${digitsOnly}`;
          const response = await apiClient.get<AvailabilityResponse>('/users/check-availability', {
            params: { phone: phoneWithCode },
            signal: abortController.signal,
          });
          if (!mountedRef.current) return;
          setState((prev) => ({
            ...prev,
            phoneError: response.data.phoneExists
              ? 'This phone number is already registered'
              : null,
            isCheckingPhone: false,
          }));
        } catch (err) {
          if (!mountedRef.current) return;
          if (abortController.signal.aborted) return;
          console.error('[useCheckUserAvailability] phone check failed:', err);
          setState((prev) => ({ ...prev, isCheckingPhone: false }));
        }
      })();
    }, DEBOUNCE_MS);
  }, []);

  const checkEmail = useCallback((email: string) => {
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    emailAbortRef.current?.abort();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setState((prev) => ({ ...prev, emailError: null, isCheckingEmail: false }));
      return;
    }

    setState((prev) => ({ ...prev, isCheckingEmail: true, emailError: null }));

    emailTimerRef.current = setTimeout(() => {
      const abortController = new AbortController();
      emailAbortRef.current = abortController;

      void (async () => {
        try {
          const response = await apiClient.get<AvailabilityResponse>('/users/check-availability', {
            params: { email },
            signal: abortController.signal,
          });
          if (!mountedRef.current) return;
          setState((prev) => ({
            ...prev,
            emailError: response.data.emailExists ? 'This email is already registered' : null,
            isCheckingEmail: false,
          }));
        } catch (err) {
          if (!mountedRef.current) return;
          if (abortController.signal.aborted) return;
          console.error('[useCheckUserAvailability] email check failed:', err);
          setState((prev) => ({ ...prev, isCheckingEmail: false }));
        }
      })();
    }, DEBOUNCE_MS);
  }, []);

  const clearErrors = useCallback(() => {
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    phoneAbortRef.current?.abort();
    emailAbortRef.current?.abort();
    setState({
      phoneError: null,
      emailError: null,
      isCheckingPhone: false,
      isCheckingEmail: false,
    });
  }, []);

  return {
    state,
    checkPhone,
    checkEmail,
    clearErrors,
    hasErrors: Boolean(state.phoneError || state.emailError),
    isChecking: state.isCheckingPhone || state.isCheckingEmail,
  };
}
