'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { CommissionState } from '@tejas96/shared/utils';
import type { AxiosError } from 'axios';

import { useRefreshMoneyViews } from './payment-approvals';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// Types mirror apps/backend/src/modules/employees/commissions (sql/*.sql.ts).

export type ResellerPeriod = 'month' | 'fy' | 'all';

export interface ResellerSummary {
  resellerId: string;
  name: string;
  code: string | null;
  status: string;
  ratePercent: number | null;
  leads: number;
  quoted: number;
  won: number;
  winRate: number | null;
  revenuePaise: number;
  pendingPaise: number;
  owedPaise: number;
  paidPaise: number;
  toRecoverPaise: number;
}
export interface ResellerTotals {
  pendingPaise: number;
  owedPaise: number;
  paidPaise: number;
  toRecoverPaise: number;
}
export interface ResellerHeader {
  resellerId: string;
  name: string;
  code: string | null;
  status: string;
  ratePercent: number | null;
  bankName: string | null;
  accountLast4: string | null;
  gstin: string | null;
  phone: string | null;
}
export interface CommissionRow {
  id: string;
  resellerId: string;
  resellerName: string;
  quoteId: string;
  quoteNumber: string;
  acceptedAt: string | null;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectNumber: string | null;
  projectStatus: string | null;
  basePaise: number;
  ratePercent: number;
  amountPaise: number;
  baseSource: 'discounted_base' | 'derived' | 'manual' | 'missing';
  rateSource: 'profile' | 'manual' | 'missing';
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payoutRequestId: string | null;
  payoutRequestNo: string | null;
  payoutRejectedReason: string | null;
  expenseEntryId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  paymentMode: string | null;
  paymentReference: string | null;
  invoiceNumber: string | null;
  recoveredAt: string | null;
  recoveredPaise: number | null;
  recoveryNotes: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: string;
  state: CommissionState;
}
export interface MissingRow {
  quoteId: string;
  quoteNumber: string;
  acceptedAt: string;
  resellerId: string;
  resellerName: string;
  customerName: string;
}

const keys = {
  root: () => ['resellers'] as const,
  list: (period: ResellerPeriod) => ['resellers', 'list', period] as const,
  one: (id: string, period: ResellerPeriod) => ['resellers', 'one', id, period] as const,
  missing: () => ['resellers', 'missing'] as const,
};

export function useResellers(period: ResellerPeriod): UseQueryResult<
  {
    rows: ResellerSummary[];
    totals: ResellerTotals;
    resellerUnknownCount: number;
    periodStart: string | null;
  },
  AxiosError
> {
  return useQuery({
    queryKey: keys.list(period),
    queryFn: async ({ signal }) =>
      (await apiClient.get('/resellers', { params: { period }, signal })).data,
    staleTime: 15_000,
  });
}

export function useReseller(
  id: string,
  period: ResellerPeriod,
): UseQueryResult<
  {
    reseller: ResellerHeader;
    summary: ResellerSummary;
    commissions: CommissionRow[];
    periodStart: string | null;
  },
  AxiosError
> {
  return useQuery({
    queryKey: keys.one(id, period),
    queryFn: async ({ signal }) =>
      (await apiClient.get(`/resellers/${id}`, { params: { period }, signal })).data,
    enabled: Boolean(id),
    // A wrong id stays wrong: show "not found" at once instead of retrying.
    retry: (count, error) => error.response?.status !== 404 && count < 1,
    staleTime: 15_000,
  });
}

export function useMissingCommissions(): UseQueryResult<
  { sinceLaunch: MissingRow[]; beforeLaunch: MissingRow[]; liveFrom: string | null },
  AxiosError
> {
  return useQuery({
    queryKey: keys.missing(),
    queryFn: async ({ signal }) =>
      (await apiClient.get('/resellers/missing-commissions', { signal })).data,
    staleTime: 30_000,
  });
}

export function useCommissionMutations() {
  const qc = useQueryClient();
  const refreshMoney = useRefreshMoneyViews();
  const done = (msg: string) => () => {
    void qc.invalidateQueries({ queryKey: keys.root() });
    refreshMoney();
    showToast.success(msg);
  };
  // A refusal usually means the row moved under us (another tab approved it,
  // a payout went into review): reload so the screen stops showing the old state.
  const fail = (e: unknown) => {
    void qc.invalidateQueries({ queryKey: keys.root() });
    showToast.error(getErrorMessage(e));
  };

  return {
    approve: useMutation({
      mutationFn: async (id: string) =>
        (await apiClient.post<CommissionRow>(`/commissions/${id}/approve`)).data,
      onSuccess: done('Approved'),
      onError: fail,
    }),
    edit: useMutation({
      mutationFn: async (v: {
        id: string;
        baseAmount?: number;
        ratePercent?: number;
        reason: string;
      }) =>
        (
          await apiClient.patch<CommissionRow>(`/commissions/${v.id}`, {
            baseAmount: v.baseAmount,
            ratePercent: v.ratePercent,
            reason: v.reason,
          })
        ).data,
      onSuccess: done('Saved'),
      onError: fail,
    }),
    cancel: useMutation({
      mutationFn: async (v: { id: string; reason: string }) =>
        (await apiClient.post<CommissionRow>(`/commissions/${v.id}/cancel`, { reason: v.reason }))
          .data,
      onSuccess: done('Cancelled'),
      onError: fail,
    }),
    recordPayment: useMutation({
      mutationFn: async (v: {
        commissionIds: string[];
        valueDate: string;
        paymentMethod: string;
        reference: string;
        invoiceNumber?: string;
        invoiceDate?: string;
        notes?: string;
      }) => (await apiClient.post<CommissionRow[]>('/commissions/record-payment', v)).data,
      onSuccess: done('Sent for approval — it shows in Payment Approvals'),
      onError: fail,
    }),
    closeRecovery: useMutation({
      mutationFn: async (v: { id: string; amountReceived: number; date: string; note: string }) =>
        (
          await apiClient.post<CommissionRow>(`/commissions/${v.id}/close-recovery`, {
            amountReceived: v.amountReceived,
            date: v.date,
            note: v.note,
          })
        ).data,
      onSuccess: done('Recovery closed'),
      onError: fail,
    }),
    createMissing: useMutation({
      mutationFn: async (quoteId: string) =>
        (await apiClient.post(`/resellers/missing-commissions/${quoteId}/create`)).data,
      onSuccess: done('Commission created'),
      onError: fail,
    }),
    dismissMissing: useMutation({
      mutationFn: async (v: { quoteId: string; note: string }) =>
        (
          await apiClient.post(`/resellers/missing-commissions/${v.quoteId}/dismiss`, {
            note: v.note,
          })
        ).data,
      onSuccess: done('Dismissed'),
      onError: fail,
    }),
  };
}
