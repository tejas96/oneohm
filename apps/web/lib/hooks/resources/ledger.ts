'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import type { PaymentApproval } from '@/lib/hooks/resources/payment-approvals';
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
  /**
   * Who submitted the payment and who approved it in. Both, because the
   * ledger's own `createdBy` is the approver — approval performs the insert —
   * so one name alone would credit the wrong person. Null on entries recorded
   * before the approval queue existed.
   */
  recordedByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
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
  /** Present on org-wide `/finance/entries` rows. */
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
  customerName?: string;
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
  entryCreatedAt: string;
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

export function lastReceiptValueDate(entries: LedgerEntry[]): string | null {
  let last: string | null = null;
  for (const entry of entries) {
    if (entry.entryType !== 'receipt' || entry.direction !== 'in' || entry.reversesId) continue;
    if (!last || entry.valueDate > last) last = entry.valueDate;
  }
  return last;
}

export interface LedgerFilters {
  direction?: LedgerDirection;
  from?: string;
  to?: string;
  projectId?: string;
  customerId?: string;
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
  root: () => ['ledger'] as const,
  kpis: (from?: string, to?: string) => [...ledgerKeys.root(), 'kpis', from, to] as const,
  cashFlow: (from?: string, to?: string, grain?: string) =>
    [...ledgerKeys.root(), 'cash-flow', from, to, grain] as const,
  entries: (f: LedgerFilters) => [...ledgerKeys.root(), 'entries', f] as const,
  receivables: (page: number, limit: number) =>
    [...ledgerKeys.root(), 'receivables', page, limit] as const,
  project: (projectId: string) => [...ledgerKeys.root(), 'project', projectId] as const,
};

// ============================================================================
// Reads
// ============================================================================

export function useFinanceKpis(
  from?: string,
  to?: string,
): UseQueryResult<FinanceKpis, AxiosError> {
  return useQuery({
    queryKey: ledgerKeys.kpis(from, to),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<FinanceKpis>('/finance/kpis', {
        params: { from, to },
        signal,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCashFlow(
  from?: string,
  to?: string,
  grain: 'day' | 'week' | 'month' = 'month',
): UseQueryResult<CashFlowPoint[], AxiosError> {
  return useQuery({
    queryKey: ledgerKeys.cashFlow(from, to, grain),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<CashFlowPoint[]>('/finance/cash-flow', {
        params: { from, to, grain },
        signal,
      });
      return data;
    },
    staleTime: 60_000,
  });
}

export function useLedgerEntries(
  filters: LedgerFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<Paginated<LedgerEntry>, AxiosError> {
  return useQuery({
    queryKey: ledgerKeys.entries(filters),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Paginated<LedgerEntry>>('/finance/entries', {
        params: filters,
        signal,
      });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useReceivables(
  page = 1,
  limit = 25,
): UseQueryResult<Paginated<Receivable>, AxiosError> {
  return useQuery({
    queryKey: ledgerKeys.receivables(page, limit),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Paginated<Receivable>>('/finance/receivables', {
        params: { page, limit },
        signal,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useProjectLedger(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectLedgerSummary, AxiosError> {
  return useQuery({
    queryKey: ledgerKeys.project(projectId),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProjectLedgerSummary>(
        `/projects/${projectId}/ledger/summary`,
        { signal },
      );
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectEntries(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<LedgerEntry[], AxiosError> {
  return useQuery({
    queryKey: [...ledgerKeys.project(projectId), 'entries'] as const,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<LedgerEntry[]>(`/projects/${projectId}/ledger/entries`, {
        signal,
      });
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
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
export async function uploadProofFile(file: File): Promise<ProofDocumentInput> {
  const { data: presigned } = await apiClient.post<{ uploadUrl: string; fileKey: string }>(
    '/storage/presigned-url',
    {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category: 'document',
    },
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
  const queryClient = useQueryClient();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ledgerKeys.root() });
  };

  // These endpoints no longer write to the ledger — they queue the money for
  // approval and return the pending request, which has a requestNo and no
  // entryNo. Reporting "recorded" here would tell the user their customer's
  // balance had moved when it has not.
  const recordReceipt = useMutation({
    mutationFn: async (input: RecordReceiptInput) => {
      const { data } = await apiClient.post<PaymentApproval>(
        `/projects/${projectId}/ledger/receipts`,
        input,
      );
      return data;
    },
    onSuccess: (request) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['payment-approvals'] });
      showToast.success(
        `${request.requestNo} submitted for approval — the balance updates once approved`,
      );
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const recordExpense = useMutation({
    mutationFn: async (input: RecordExpenseInput) => {
      const { data } = await apiClient.post<PaymentApproval>(
        `/projects/${projectId}/ledger/expenses`,
        input,
      );
      return data;
    },
    onSuccess: (request) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['payment-approvals'] });
      showToast.success(`${request.requestNo} submitted for approval`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  /** Corrections are new rows — the original stays visible forever. */
  const reverseEntry = useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      const { data } = await apiClient.post<PaymentApproval>(
        `/ledger/entries/${entryId}/reverse`,
        { reason },
      );
      return data;
    },
    onSuccess: (request) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['payment-approvals'] });
      showToast.success(
        `${request.requestNo} submitted — the reversal takes effect once approved`,
      );
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
