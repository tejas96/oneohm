'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CreateCustomerProfileFormData } from '../schemas/customer.schema';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys
// ============================================================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface CustomerResponse {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  leadSource?: string;
  referralCode?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityResponse {
  phoneExists: boolean;
  emailExists: boolean;
  phoneError?: string;
  emailError?: string;
}

export interface AvailabilityState {
  phoneError: string | null;
  emailError: string | null;
  isCheckingPhone: boolean;
  isCheckingEmail: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to create a new customer
 * Uses TanStack Query mutation with cache invalidation
 */
export function useCreateCustomer(): UseMutationResult<
  CustomerResponse,
  AxiosError,
  CreateCustomerProfileFormData
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (data: CreateCustomerProfileFormData): Promise<CustomerResponse> => {
      // Prepend +91 to phone numbers for backend
      const payload = {
        ...data,
        phone: `+91${data.phone}`,
        alternatePhone: data.alternatePhone ? `+91${data.alternatePhone}` : undefined,
        country: 'India',
      };

      const { data: response } = await apiClient.post<CustomerResponse>('/customers', payload, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate customer lists to refetch
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// ============================================================================
// Check Availability Hook
// ============================================================================

interface CheckAvailabilityParams {
  phone?: string;
  email?: string;
  excludeCustomerId?: string;
}

/**
 * Hook to check if phone/email already exists in the system
 * Used for real-time duplicate validation on form fields
 *
 * Features:
 * - Debounced API calls (500ms)
 * - Separate loading states for phone and email
 * - Returns error messages from backend
 */
export function useCheckAvailability(): {
  state: AvailabilityState;
  checkPhone: (phone: string, excludeCustomerId?: string) => void;
  checkEmail: (email: string, excludeCustomerId?: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
} {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const [state, setState] = useState<AvailabilityState>({
    phoneError: null,
    emailError: null,
    isCheckingPhone: false,
    isCheckingEmail: false,
  });

  // Refs to track debounce timers
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(
    async (params: CheckAvailabilityParams): Promise<AvailabilityResponse> => {
      const queryParams = new URLSearchParams();

      if (params.phone) {
        queryParams.append('phone', `+91${params.phone}`);
      }
      if (params.email) {
        queryParams.append('email', params.email);
      }
      if (params.excludeCustomerId) {
        queryParams.append('excludeCustomerId', params.excludeCustomerId);
      }

      const url = `/customers/check-availability?${queryParams.toString()}`;

      const { data } = await apiClient.get<AvailabilityResponse>(url, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    [organizationId]
  );

  const checkPhone = useCallback(
    (phone: string, excludeCustomerId?: string) => {
      // Clear any pending timer
      if (phoneTimerRef.current) {
        clearTimeout(phoneTimerRef.current);
      }

      // Clear error if phone is empty or invalid format
      if (phone.length !== 10) {
        setState((prev) => ({ ...prev, phoneError: null, isCheckingPhone: false }));
        return;
      }

      // Set checking state
      setState((prev) => ({ ...prev, isCheckingPhone: true }));

      // Debounce the API call
      phoneTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const result = await checkAvailability({ phone, excludeCustomerId });
            setState((prev) => ({
              ...prev,
              phoneError: result.phoneExists ? (result.phoneError ?? 'Phone already registered') : null,
              isCheckingPhone: false,
            }));
          } catch {
            setState((prev) => ({ ...prev, isCheckingPhone: false }));
          }
        })();
      }, 500);
    },
    [checkAvailability]
  );

  const checkEmail = useCallback(
    (email: string, excludeCustomerId?: string) => {
      // Clear any pending timer
      if (emailTimerRef.current) {
        clearTimeout(emailTimerRef.current);
      }

      // Clear error if email is empty or invalid format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        setState((prev) => ({ ...prev, emailError: null, isCheckingEmail: false }));
        return;
      }

      // Set checking state
      setState((prev) => ({ ...prev, isCheckingEmail: true }));

      // Debounce the API call
      emailTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const result = await checkAvailability({ email, excludeCustomerId });
            setState((prev) => ({
              ...prev,
              emailError: result.emailExists ? (result.emailError ?? 'Email already registered') : null,
              isCheckingEmail: false,
            }));
          } catch {
            setState((prev) => ({ ...prev, isCheckingEmail: false }));
          }
        })();
      }, 500);
    },
    [checkAvailability]
  );

  const clearErrors = useCallback(() => {
    setState({
      phoneError: null,
      emailError: null,
      isCheckingPhone: false,
      isCheckingEmail: false,
    });
  }, []);

  // Cleanup timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (phoneTimerRef.current) {
        clearTimeout(phoneTimerRef.current);
      }
      if (emailTimerRef.current) {
        clearTimeout(emailTimerRef.current);
      }
    };
  }, []);

  const hasErrors = Boolean(state.phoneError || state.emailError);

  return {
    state,
    checkPhone,
    checkEmail,
    clearErrors,
    hasErrors,
  };
}
