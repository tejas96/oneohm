'use client';

import { LeadSource } from '@oneohm-epc/shared/types';
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
  all: (orgId?: string) => ['customers', orgId] as const,
  lists: (orgId?: string) => [...customerKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...customerKeys.lists(orgId), filters] as const,
  details: (orgId?: string) => [...customerKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...customerKeys.details(orgId), id] as const,
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
      // Resolve leadSource: if user selected "other", use the typed text as leadSource
      const leadSourceValue = data.leadSource ?? undefined;
      const resolvedLeadSource =
        leadSourceValue === LeadSource.OTHER
          ? (data.leadSourceOther ?? undefined)
          : leadSourceValue;

      // Strip form-only fields before sending to API
      const { leadSourceOther: leadSourceOtherVal, ...rest } = data;
      void leadSourceOtherVal; // intentionally unused — already resolved above

      const payload = {
        ...rest,
        phone: `+91${data.phone}`,
        alternatePhone: data.alternatePhone ? `+91${data.alternatePhone}` : undefined,
        email: data.email ? data.email.trim().toLowerCase() : undefined,
        country: 'India',
        leadSource: resolvedLeadSource,
        // If groupCode is empty string, don't send it (backend only accepts valid code or nothing)
        groupCode: data.groupCode || undefined,
        groupName: data.groupName || undefined,
      };

      const { data: response } = await apiClient.post<CustomerResponse>('/customers', payload, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(organizationId) });
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
 * - Debounced API calls (550ms)
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
        queryParams.append('email', params.email.trim().toLowerCase());
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
    [organizationId],
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
              phoneError: result.phoneExists
                ? (result.phoneError ?? 'Phone already registered')
                : null,
              isCheckingPhone: false,
            }));
          } catch {
            setState((prev) => ({ ...prev, isCheckingPhone: false }));
          }
        })();
      }, 550);
    },
    [checkAvailability],
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
              emailError: result.emailExists
                ? (result.emailError ?? 'Email already registered')
                : null,
              isCheckingEmail: false,
            }));
          } catch {
            setState((prev) => ({ ...prev, isCheckingEmail: false }));
          }
        })();
      }, 550);
    },
    [checkAvailability],
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
