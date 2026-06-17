'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  ReimbursementStatus,
  type ExpenseCategory,
  type ExpensePaidByType,
  type PaymentMethod,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { useOrgContext } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types — mirror backend ExpenseResponseDto.
// ============================================================================

export interface ExpenseProductLink {
  id: string;
  productId?: string | null;
  itemName?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
}

export interface ProjectExpense {
  id: string;
  organizationId: string;
  projectId: string;
  expenseNumber: string;
  category: ExpenseCategory;
  vendorName?: string | null;
  amount: number;
  currency: string;
  /** ISO date (YYYY-MM-DD). */
  expenseDate: string;
  paymentMethod: PaymentMethod;
  paidBy: ExpensePaidByType;
  paidByEmployeeId?: string | null;
  reimbursementStatus: ReimbursementStatus;
  reimbursedAt?: string | null;
  reimbursedBy?: string | null;
  /** True when caller bypassed the procurement guard at create time. */
  overrideUsed: boolean;
  overrideReason?: string | null;
  notes?: string | null;
  productLinks?: ExpenseProductLink[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface ExpenseProductLinkInput {
  productId?: string;
  itemName?: string;
  unit?: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  vendorName?: string;
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  paidBy?: ExpensePaidByType;
  paidByEmployeeId?: string;
  notes?: string;
  productLinks?: ExpenseProductLinkInput[];
  override?: boolean;
  overrideReason?: string;
}

export interface UpdateExpensePayload {
  category?: ExpenseCategory;
  vendorName?: string;
  amount?: number;
  expenseDate?: string;
  paymentMethod?: PaymentMethod;
  paidBy?: ExpensePaidByType;
  paidByEmployeeId?: string;
  notes?: string;
  productLinks?: ExpenseProductLinkInput[];
}

export interface ExpenseListFilters {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  vendorSearch?: string;
  paidBy?: ExpensePaidByType;
  reimbursementStatus?: ReimbursementStatus;
  page?: number;
  limit?: number;
}

export interface ExpenseListResponse {
  data: ProjectExpense[];
  total: number;
  page: number;
  limit: number;
}

export interface ExpenseProjectSummary {
  total: number;
  byCategory: Array<{ category: ExpenseCategory; amount: number; count: number }>;
  pendingReimbursementAmount: number;
}

// ============================================================================
// Cache keys
// ============================================================================

export const projectExpenseKeys = {
  all: (orgId?: string) => ['project-expenses', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...projectExpenseKeys.all(orgId), 'project', projectId] as const,
  list: (orgId: string | undefined, projectId: string, filters: ExpenseListFilters) =>
    [...projectExpenseKeys.byProject(orgId, projectId), 'list', filters] as const,
  summary: (orgId: string | undefined, projectId: string) =>
    [...projectExpenseKeys.byProject(orgId, projectId), 'summary'] as const,
};

// ============================================================================
// Reads
// ============================================================================

export function useProjectExpenses(
  projectId: string,
  filters: ExpenseListFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<ExpenseListResponse, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useQuery({
    queryKey: projectExpenseKeys.list(organizationId, projectId, filters),
    queryFn: async ({ signal }): Promise<ExpenseListResponse> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      });
      const qs = params.toString();
      const { data } = await apiClient.get<ExpenseListResponse>(
        `/projects/${projectId}/expenses${qs ? `?${qs}` : ''}`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: isReady && !!projectId && options?.enabled !== false,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useProjectExpenseSummary(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ExpenseProjectSummary, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useQuery({
    queryKey: projectExpenseKeys.summary(organizationId, projectId),
    queryFn: async ({ signal }): Promise<ExpenseProjectSummary> => {
      const { data } = await apiClient.get<ExpenseProjectSummary>(
        `/projects/${projectId}/expenses/summary`,
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
 * Bundles all expense mutations (create, update, delete, reimbursement
 * FSM) into one hook. Every mutation invalidates the project's expense
 * list, summary, AND the BOM procurement-status — because procurement
 * spend is derived from expense_product_links and changes immediately
 * when an expense moves.
 */
export function useProjectExpenseMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { organizationId, orgHeaders } = useOrgContext();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({
      queryKey: projectExpenseKeys.byProject(organizationId, projectId),
    });
    // BOM procurement-status keys live under the bom resource; invalidate
    // the whole bom space for this org rather than mirror its key shape.
    void queryClient.invalidateQueries({ queryKey: ['bom', organizationId] });
    void queryClient.invalidateQueries({
      queryKey: ['bom-procurement-status', organizationId, projectId],
    });
  };

  const create = useMutation<ProjectExpense, AxiosError, CreateExpensePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<ProjectExpense>(
        `/projects/${projectId}/expenses`,
        payload,
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      showToast.success('Expense recorded');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const update = useMutation<
    ProjectExpense,
    AxiosError,
    { id: string; payload: UpdateExpensePayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<ProjectExpense>(`/expenses/${id}`, payload, {
        headers: orgHeaders,
      });
      return data;
    },
    onSuccess: () => {
      showToast.success('Expense updated');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const remove = useMutation<void, AxiosError, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/expenses/${id}`, { headers: orgHeaders });
    },
    onSuccess: () => {
      showToast.success('Expense deleted');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  /**
   * v1 FSM: only `pending → reimbursed` is allowed. The backend stamps
   * reimbursed_at + reimbursed_by atomically.
   */
  const markReimbursed = useMutation<ProjectExpense, AxiosError, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<ProjectExpense>(
        `/expenses/${id}/reimbursement-status`,
        { status: ReimbursementStatus.REIMBURSED },
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      showToast.success('Marked reimbursed');
      invalidate();
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  return { create, update, remove, markReimbursed };
}
