'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useOrgContext } from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types — every amount is INTEGER PAISE
// ============================================================================

/**
 * Money crosses the wire as integer paise, never rupees.
 *
 * Rounding at an API boundary is how ₹0.01 discrepancies are born. Components
 * format for display with `formatPaise`; they never sum rupee values, because
 * summing floats reintroduces exactly the drift this rebuild removed.
 */
export type Paise = number;

export type LedgerDirection = 'in' | 'out';
export type MilestoneDerivedStatus = 'pending' | 'partial' | 'paid' | 'waived';

export interface LedgerEntry {
  id: string;
  entryNo: string;
  entryType: 'receipt' | 'expense' | 'refund' | 'write_off';
  direction: LedgerDirection;
  /** Signed. Negative rows are reversals or money out. */
  amountPaise: Paise;
  /** The date the money actually moved (IST), not when it was keyed in. */
  valueDate: string;
  /** True only for historical rows whose real value date is unrecoverable. */
  valueDateIsInferred: boolean;
  paymentMethod?: string | null;
  reference?: string | null;
  counterparty?: string | null;
  category?: string | null;
  notes?: string | null;
  /** Set when this entry reverses another — render it as a correction. */
  reversesId?: string | null;
  reversalReason?: string | null;
  createdAt: string;
  createdBy: string;
}

/**
 * One entry's contribution to one milestone.
 *
 * `allocatedPaise` is the milestone figure. `entryAmountPaise` is the entry's own
 * total and is almost always larger — a single receipt routinely spans several
 * milestones. Showing the entry total under a milestone overstates it, which is
 * the defect this type exists to make impossible.
 */
export interface MilestoneAllocation {
  allocationId: string;
  entryId: string;
  entryNo: string;
  direction: LedgerDirection;
  /** What this entry put against THIS milestone. Negative on a reversal. */
  allocatedPaise: Paise;
  /** Context only. Never render this as the milestone amount. */
  entryAmountPaise: Paise;
  valueDate: string;
  valueDateIsInferred: boolean;
  paymentMethod?: string | null;
  reference?: string | null;
  /** Set when this row belongs to a reversing entry. */
  reversesId?: string | null;
  reversalReason?: string | null;
  reversesEntryNo?: string | null;
  /** Set when this entry has since been reversed. */
  reversedByEntryNo?: string | null;
  isInferred: boolean;
}

export interface MilestoneBalance {
  milestoneId: string;
  displayOrder: number;
  name: string;
  stage: string;
  /** On a loan-financed project the bank pays its share — never chase the customer for it. */
  payerType: 'customer' | 'lender';
  dueDate?: string | null;
  expectedPaise: Paise;
  allocatedPaise: Paise;
  /** The "short by X" figure. */
  balancePaise: Paise;
  overAllocatedPaise: Paise;
  derivedStatus: MilestoneDerivedStatus;
  daysOverdue: number;
  /** Distinct entries touching this milestone, reversal mirrors included. */
  entryCount: number;
  /** Exactly which entries paid this milestone. Server-joined on real keys. */
  allocations: MilestoneAllocation[];
}

export interface ProjectLedgerSummary {
  contractPaise: Paise;
  /** The part of the contract that came from the signed quote. */
  quotedPaise: Paise;
  /** Agreed after signing. `quotedPaise + changeOrderPaise === contractPaise`. */
  changeOrderPaise: Paise;
  expectedPaise: Paise;
  waivedPaise: Paise;
  receivedPaise: Paise;
  spentPaise: Paise;
  outstandingPaise: Paise;
  /** Money received but not attributed to a milestone — customer credit. Surface it. */
  unallocatedPaise: Paise;
  netCashPaise: Paise;
  receiptCount: number;
  milestoneCount: number;
  milestones: MilestoneBalance[];
}

export interface FinanceKpis {
  revenueInRange: number;
  spendInRange: number;
  netCashflowInRange: number;
  /** A SNAPSHOT as of today — deliberately not bounded by the selected period. */
  outstandingNow: number;
  overdueCountNow: number;
  receiptCountInRange: number;
  expenseCountInRange: number;
  unallocatedCredit: number;
  meterInstallations: number;
}

export interface CashFlowPoint {
  month: string;
  cashIn: number;
  cashOut: number;
  net: number;
}

export interface Receivable {
  milestoneId: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerName: string | null;
  displayOrder: number;
  milestoneName: string;
  payerType: 'customer' | 'lender';
  expectedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate?: string | null;
  daysOverdue: number;
  derivedStatus: MilestoneDerivedStatus;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LedgerFilters {
  direction?: LedgerDirection;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query keys
// ============================================================================

/**
 * One root key for everything money.
 *
 * The previous hooks invalidated three separate key trees, which existed only
 * because `paid_amount` was cached in two tables and could disagree. With every
 * balance derived from the ledger there is exactly one cache to bust.
 */
export const ledgerKeys = {
  root: (orgId?: string) => ['ledger', orgId] as const,
  kpis: (orgId: string | undefined, from?: string, to?: string) =>
    [...ledgerKeys.root(orgId), 'kpis', from, to] as const,
  cashFlow: (orgId: string | undefined, from?: string, to?: string, grain?: string) =>
    [...ledgerKeys.root(orgId), 'cash-flow', from, to, grain] as const,
  entries: (orgId: string | undefined, f: LedgerFilters) =>
    [...ledgerKeys.root(orgId), 'entries', f] as const,
  receivables: (orgId: string | undefined, page: number, limit: number) =>
    [...ledgerKeys.root(orgId), 'receivables', page, limit] as const,
  project: (orgId: string | undefined, projectId: string) =>
    [...ledgerKeys.root(orgId), 'project', projectId] as const,
};

// ============================================================================
// Reads
// ============================================================================

export function useFinanceKpis(
  from?: string,
  to?: string,
): UseQueryResult<FinanceKpis, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: ledgerKeys.kpis(organizationId, from, to),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<FinanceKpis>('/finance/kpis', {
        params: { from, to },
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady,
    staleTime: 30_000,
  });
}

export function useCashFlow(
  from?: string,
  to?: string,
  grain: 'day' | 'week' | 'month' = 'month',
): UseQueryResult<CashFlowPoint[], AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: ledgerKeys.cashFlow(organizationId, from, to, grain),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<CashFlowPoint[]>('/finance/cash-flow', {
        params: { from, to, grain },
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady,
    staleTime: 60_000,
  });
}

export function useLedgerEntries(
  filters: LedgerFilters = {},
): UseQueryResult<Paginated<LedgerEntry>, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: ledgerKeys.entries(organizationId, filters),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Paginated<LedgerEntry>>('/finance/entries', {
        params: filters,
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady,
    staleTime: 30_000,
  });
}

export function useReceivables(
  page = 1,
  limit = 25,
): UseQueryResult<Paginated<Receivable>, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: ledgerKeys.receivables(organizationId, page, limit),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Paginated<Receivable>>('/finance/receivables', {
        params: { page, limit },
        headers: orgHeaders,
        signal,
      });
      return data;
    },
    enabled: isReady,
    staleTime: 30_000,
  });
}

export function useProjectLedger(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectLedgerSummary, AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: ledgerKeys.project(organizationId, projectId),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProjectLedgerSummary>(
        `/projects/${projectId}/ledger/summary`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: isReady && !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectEntries(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<LedgerEntry[], AxiosError> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  return useQuery({
    queryKey: [...ledgerKeys.project(organizationId, projectId), 'entries'] as const,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<LedgerEntry[]>(`/projects/${projectId}/ledger/entries`, {
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
// Writes
// ============================================================================

export interface ProofDocumentInput {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export interface RecordReceiptInput {
  amountPaise: Paise;
  valueDate?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  /** Omit to let the receipt fill milestones in order and spill over. */
  allocations?: Array<{ milestoneId: string; amountPaise: Paise }>;
  proofDocument?: ProofDocumentInput;
}

export interface RecordExpenseInput {
  amountPaise: Paise;
  valueDate?: string;
  category: string;
  payee?: string;
  paymentMethod?: string;
  notes?: string;
  proofDocument?: ProofDocumentInput;
}

/**
 * Upload proof to S3 and return the reference the API expects.
 *
 * Two steps by design: the browser PUTs the file straight to storage with a
 * presigned URL, so the file never passes through the API server. Only the
 * resulting key is sent with the receipt.
 */
export async function uploadProofFile(
  file: File,
  orgHeaders: Record<string, string>,
): Promise<ProofDocumentInput> {
  const { data: presigned } = await apiClient.post<{ uploadUrl: string; fileKey: string }>(
    '/storage/presigned-url',
    {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category: 'document',
    },
    { headers: orgHeaders },
  );

  await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  return {
    fileKey: presigned.fileKey,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}

/**
 * All money mutations for a project.
 *
 * Every one invalidates the single ledger root, so a receipt recorded on the
 * project page also refreshes the dashboard and the receivables list — they all
 * read the same derived balances.
 */
export function useLedgerMutations(projectId: string) {
  const { organizationId, orgHeaders } = useOrgContext();
  const queryClient = useQueryClient();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ledgerKeys.root(organizationId) });
  };

  const recordReceipt = useMutation({
    mutationFn: async (input: RecordReceiptInput) => {
      const { data } = await apiClient.post<LedgerEntry>(
        `/projects/${projectId}/ledger/receipts`,
        input,
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: (entry) => {
      invalidate();
      showToast.success(`Receipt ${entry.entryNo} recorded`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const recordExpense = useMutation({
    mutationFn: async (input: RecordExpenseInput) => {
      const { data } = await apiClient.post<LedgerEntry>(
        `/projects/${projectId}/ledger/expenses`,
        input,
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: (entry) => {
      invalidate();
      showToast.success(`Expense ${entry.entryNo} recorded`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  /** Corrections are new rows — the original stays visible forever. */
  const reverseEntry = useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      const { data } = await apiClient.post<LedgerEntry>(
        `/ledger/entries/${entryId}/reverse`,
        { reason },
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Entry reversed — both the original and the correction remain on record');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const addChangeOrder = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      amountPaise: Paise;
      dueDate?: string;
    }) => {
      const { data } = await apiClient.post<MilestoneBalance>(
        `/projects/${projectId}/change-orders`,
        input,
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Change order added — the contract total has increased');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const waiveMilestone = useMutation({
    mutationFn: async ({ milestoneId, reason }: { milestoneId: string; reason: string }) => {
      const { data } = await apiClient.patch<{ id: string; status: string }>(
        `/ledger/milestones/${milestoneId}/waive`,
        { reason },
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Milestone waived');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  return { recordReceipt, recordExpense, reverseEntry, addChangeOrder, waiveMilestone };
}
