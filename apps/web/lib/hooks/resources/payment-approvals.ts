'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types — mirror apps/backend/src/modules/payment-approvals.
//
// Nothing here counts towards a balance. A pending row is a claim; the ledger
// only learns about it when an approver says yes.
// ============================================================================

export type ApprovalKind = 'receipt' | 'expense' | 'reversal';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PaymentApproval {
  id: string;
  requestNo: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  projectId: string;
  /** Joined server-side — the queue is worked by someone who did not record it. */
  projectNumber?: string | null;
  projectName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  entryType: string;
  direction: 'in' | 'out';
  /** Signed integer paise, same convention as the ledger. */
  amountPaise: number;
  valueDate: string;
  paymentMethod?: string | null;
  counterparty?: string | null;
  category?: string | null;
  reference?: string | null;
  notes?: string | null;
  reversesEntryId?: string | null;
  reversalReason?: string | null;
  proofDocumentId?: string | null;
  /** Resolved from the linked document so the evidence can actually be opened. */
  proofUrl?: string | null;
  proofFileName?: string | null;
  proofMimeType?: string | null;
  submittedBy: string;
  submittedByName?: string | null;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  ledgerEntryId?: string | null;
  /** Only returned by the single-request endpoint. */
  possibleDuplicates?: PaymentApproval[];
}

export interface ApprovalFilters {
  status?: ApprovalStatus;
  kind?: ApprovalKind;
  projectId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApprovalPage {
  data: PaymentApproval[];
  total: number;
  page: number;
  limit: number;
}

export interface ImpactLine {
  milestoneId: string;
  milestoneName: string;
  appliedPaise: number;
  balanceAfterPaise: number;
  settlesFully: boolean;
}

export interface ApprovalImpact {
  lines: ImpactLine[];
  unallocatedPaise: number;
}

export interface BulkApproveResult {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
}

// ============================================================================
// Query keys
// ============================================================================

export const approvalKeys = {
  root: () => ['payment-approvals'] as const,
  list: (filters: ApprovalFilters) => [...approvalKeys.root(), 'list', filters] as const,
  one: (id: string) => [...approvalKeys.root(), 'one', id] as const,
  impact: (id: string) => [...approvalKeys.root(), 'impact', id] as const,
  summary: () => [...approvalKeys.root(), 'summary'] as const,
};

/** Drops empty values so the key does not churn between `{}` and `{x: undefined}`. */
function compact<T extends object>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

// ============================================================================
// Reads
// ============================================================================

export function usePaymentApprovals(
  filters: ApprovalFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<ApprovalPage, AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: approvalKeys.list(params),
    queryFn: async ({ signal }): Promise<ApprovalPage> => {
      const { data } = await apiClient.get<ApprovalPage>('/payment-approvals', { params, signal });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: 15_000,
  });
}

export function usePaymentApproval(
  id: string | null,
): UseQueryResult<PaymentApproval, AxiosError> {
  return useQuery({
    queryKey: approvalKeys.one(id ?? ''),
    queryFn: async ({ signal }): Promise<PaymentApproval> => {
      const { data } = await apiClient.get<PaymentApproval>(`/payment-approvals/${id}`, { signal });
      return data;
    },
    enabled: Boolean(id),
  });
}

/**
 * What approving would settle. A preview of this moment only — the binding
 * allocation is recomputed server-side at approval.
 */
export function useApprovalImpact(id: string | null): UseQueryResult<ApprovalImpact, AxiosError> {
  return useQuery({
    queryKey: approvalKeys.impact(id ?? ''),
    queryFn: async ({ signal }): Promise<ApprovalImpact> => {
      const { data } = await apiClient.get<ApprovalImpact>(`/payment-approvals/${id}/impact`, {
        signal,
      });
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useApprovalSummary(): UseQueryResult<{ pendingCount: number }, AxiosError> {
  return useQuery({
    queryKey: approvalKeys.summary(),
    queryFn: async ({ signal }): Promise<{ pendingCount: number }> => {
      const { data } = await apiClient.get<{ pendingCount: number }>('/payment-approvals/summary', {
        signal,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useApprovalMutations() {
  const queryClient = useQueryClient();

  /**
   * Approving moves money, so the ledger and org-finance caches are stale too —
   * not just the approval list.
   */
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: approvalKeys.root() });
    void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    void queryClient.invalidateQueries({ queryKey: ['finance-org'] });
  };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<PaymentApproval>(`/payment-approvals/${id}/approve`);
      return data;
    },
    onSuccess: (row) => {
      invalidate();
      showToast.success(`${row.requestNo} approved — the balance is updated`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.post<PaymentApproval>(`/payment-approvals/${id}/reject`, {
        reason,
      });
      return data;
    },
    onSuccess: (row) => {
      invalidate();
      showToast.success(`${row.requestNo} rejected — nothing was posted to the ledger`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<PaymentApproval>(`/payment-approvals/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Submission withdrawn');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<BulkApproveResult>('/payment-approvals/bulk-approve', {
        ids,
      });
      return data;
    },
    onSuccess: (result) => {
      invalidate();
      if (result.failed.length === 0) {
        showToast.success(`${result.approved.length} approved`);
      } else {
        // Report the first reason rather than a bare count — "2 failed" with no
        // cause sends the user hunting through rows one at a time.
        showToast.error(
          `${result.approved.length} approved, ${result.failed.length} failed — ${result.failed[0]?.reason ?? ''}`,
        );
      }
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  return { approve, reject, cancel, bulkApprove };
}
