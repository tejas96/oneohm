'use client';

import type { PaymentTermSource, PaymentTermStatus } from '@tejas96/shared/types';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useOrgContext } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types — mirror backend PaymentTermResponseDto exactly.
// ============================================================================

export interface PaymentTerm {
  id: string;
  organizationId: string;
  projectId: string;
  sourceQuoteVersionId?: string | null;
  source: PaymentTermSource;
  stage?: string | null;
  name: string;
  description?: string | null;
  displayOrder: number;
  expectedAmount: number;
  expectedPercentage?: number | null;
  currency: string;
  dueDate?: string | null;
  status: PaymentTermStatus;
  paidAmount: number;
  completedAt?: string | null;
  waivedReason?: string | null;
  notes?: string | null;
  /**
   * Optimistic-concurrency token. The backend bumps this on every save and
   * the update endpoint expects the caller to echo the value they read so
   * lost-update conflicts surface as 409s.
   */
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreatePaymentTermPayload {
  name: string;
  expectedAmount: number;
  stage?: string;
  description?: string;
  dueDate?: string;
  displayOrder?: number;
  notes?: string;
}

export interface UpdatePaymentTermPayload {
  name?: string;
  stage?: string;
  description?: string;
  expectedAmount?: number;
  dueDate?: string | null;
  displayOrder?: number;
  notes?: string | null;
  /** Required — caller must echo the version they last read. */
  version: number;
}

export interface WaivePaymentTermPayload {
  reason: string;
}

// ============================================================================
// Cache keys — keyed on organizationId so cross-org bleed is impossible.
// ============================================================================

export const paymentTermKeys = {
  all: (orgId?: string) => ['payment-terms', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...paymentTermKeys.all(orgId), 'project', projectId] as const,
};

// ============================================================================
// Reads
// ============================================================================

/**
 * List payment terms for a project (server orders by displayOrder ASC).
 * Used by the Finance tab Terms section and consumed indirectly by
 * receipt-creation drawers to populate the term picker.
 */
export function usePaymentTerms(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<PaymentTerm[], AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: paymentTermKeys.byProject(organizationId, projectId),
    queryFn: async ({ signal }): Promise<PaymentTerm[]> => {
      const { data } = await apiClient.get<PaymentTerm[]>(`/projects/${projectId}/payment-terms`, {
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady && !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Bundles all payment-term mutations into a single hook so the Terms
 * section only needs one import. Each mutation invalidates exactly the
 * caches that could be affected:
 *   - payment-terms (always — direct edit)
 *   - payments / receipts / payment summary / overview financials
 *     (when the term row that changed has linked receipts)
 */
export function usePaymentTermMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { organizationId, orgHeaders } = useOrgContext();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({
      queryKey: paymentTermKeys.byProject(organizationId, projectId),
    });
    // Receipts side-effects: anything keyed under payments/receipts/summary
    // for this project must refetch because reaggregateTerm runs in the
    // same backend transaction as the term mutation.
    void queryClient.invalidateQueries({ queryKey: ['payments', organizationId] });
    void queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] });
  };

  const create = useMutation<PaymentTerm, AxiosError, CreatePaymentTermPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<PaymentTerm>(
        `/projects/${projectId}/payment-terms`,
        payload,
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      showToast.success('Payment term added');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const update = useMutation<
    PaymentTerm,
    AxiosError,
    { id: string; payload: UpdatePaymentTermPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<PaymentTerm>(`/payment-terms/${id}`, payload, {
        headers: orgHeaders,
      });
      return data;
    },
    onSuccess: () => {
      showToast.success('Payment term updated');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const waive = useMutation<PaymentTerm, AxiosError, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const { data } = await apiClient.post<PaymentTerm>(
        `/payment-terms/${id}/waive`,
        { reason },
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      showToast.success('Payment term waived');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const remove = useMutation<void, AxiosError, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/payment-terms/${id}`, { headers: orgHeaders });
    },
    onSuccess: () => {
      showToast.success('Payment term deleted');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  /**
   * Re-snapshot terms from the project's latest quote version. Used after
   * upstream quote changes — the server soft-deletes existing
   * quote-snapshot terms (preserving manual ones) and inserts fresh ones.
   * Rejected by the server when receipts are already linked to terms.
   */
  const resnapshot = useMutation<PaymentTerm[], AxiosError>({
    mutationFn: async () => {
      const { data } = await apiClient.post<PaymentTerm[]>(
        `/projects/${projectId}/payment-terms/resnapshot`,
        {},
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      showToast.success('Payment terms re-snapshotted from latest quote');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  return { create, update, waive, remove, resnapshot };
}
