'use client';

import type {
  PaymentMethod,
  PaymentTermStatus,
  PaymentTransactionStatus,
} from '@tejas96/shared/types';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { paymentTermKeys } from './payment-terms';
import { useOrgContext } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types
// ============================================================================

/**
 * Mirrors the backend's PaymentResponseDto (the table is `payments`, but
 * everything new uses Receipt vocabulary). The legacy `/payments/*`
 * endpoints return the same shape.
 */
export interface Receipt {
  id: string;
  organizationId: string;
  projectId: string;
  customerId: string;
  paymentTermId?: string | null;
  paymentNumber: string;
  expectedAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  transactionId?: string | null;
  status: PaymentTransactionStatus;
  reconciledAt?: string | null;
  reconciledBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptProofDocumentInput {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export interface CreateReceiptPayload {
  projectId: string;
  paymentTermId?: string;
  customerId?: string;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paidAt?: string;
  status?: PaymentTransactionStatus;
  notes?: string;
  proofDocument?: ReceiptProofDocumentInput;
}

export interface UpdateReceiptStatusPayload {
  status: PaymentTransactionStatus;
  reason?: string;
}

/**
 * Per-term row inside the project receipt summary. Mirrors the backend
 * shape so the Finance tab's term/receipt cross-reference rendering can
 * consume it directly.
 */
export interface ReceiptSummaryTerm {
  id: string;
  name: string;
  displayOrder: number;
  expectedAmount: number;
  paidAmount: number;
  status: PaymentTermStatus;
  dueDate: string | null;
}

export interface ReceiptProjectSummary {
  totals: {
    totalExpected: number;
    totalReceived: number;
    pending: number;
    receiptCount: number;
  };
  terms: ReceiptSummaryTerm[];
  nextDueTermId: string | null;
  overdueCount: number;
}

// ============================================================================
// Cache keys
// ============================================================================

export const receiptKeys = {
  all: (orgId?: string) => ['receipts', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...receiptKeys.all(orgId), 'project', projectId] as const,
  summary: (orgId: string | undefined, projectId: string) =>
    [...receiptKeys.all(orgId), 'summary', projectId] as const,
};

// ============================================================================
// Reads
// ============================================================================

/**
 * List receipts for a project. We hit the legacy `/payments/project/:id`
 * endpoint because that's the only flat-list route the backend exposes
 * for receipts in v1 — `/receipts/*` only covers create/update/delete/
 * summary in this slice. The shape is identical (PaymentResponseDto), so
 * downstream consumers see Receipt[] either way.
 */
export function useProjectReceipts(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<Receipt[], AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: receiptKeys.byProject(organizationId, projectId),
    queryFn: async ({ signal }): Promise<Receipt[]> => {
      const { data } = await apiClient.get<Receipt[]>(`/payments/project/${projectId}`, {
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady && !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * Aggregated receipt summary for a project. The backend computes this
 * with independent SQL aggregations (never derived from a paged list)
 * so the Overview Financials card and the Finance tab header can both
 * trust it as canonical. Includes the per-term breakdown.
 */
export function useProjectReceiptSummary(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ReceiptProjectSummary, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: receiptKeys.summary(organizationId, projectId),
    queryFn: async ({ signal }): Promise<ReceiptProjectSummary> => {
      const { data } = await apiClient.get<ReceiptProjectSummary>(
        `/receipts/project/${projectId}/summary`,
        { headers: orgHeaders, signal },
      );
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
 * Receipt CRUD + FSM. Every mutation invalidates payment-terms,
 * receipts, and the receipt summary because the backend's
 * reaggregateTerm helper updates term paid_amount/status in the same
 * DB transaction as the receipt write.
 */
export function useReceiptMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { organizationId, orgHeaders } = useOrgContext();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({
      queryKey: receiptKeys.byProject(organizationId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: receiptKeys.summary(organizationId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: paymentTermKeys.byProject(organizationId, projectId),
    });
  };

  const create = useMutation<Receipt, AxiosError, CreateReceiptPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Receipt>('/receipts', payload, {
        headers: orgHeaders,
      });
      return data;
    },
    onSuccess: () => {
      showToast.success('Receipt recorded');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const updateStatus = useMutation<
    Receipt,
    AxiosError,
    { id: string; payload: UpdateReceiptStatusPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Receipt>(`/receipts/${id}/status`, payload, {
        headers: orgHeaders,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      showToast.success(`Receipt marked ${variables.payload.status}`);
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const remove = useMutation<void, AxiosError, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/receipts/${id}`, { headers: orgHeaders });
    },
    onSuccess: () => {
      showToast.success('Receipt deleted');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  return { create, updateStatus, remove };
}
