'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  ExpenseCategory,
  ExpensePaidByType,
  PaginatedResponse,
  PaymentMethod,
  PaymentTermStatus,
  PaymentTransactionStatus,
  ReimbursementStatus,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';


import { apiClient } from '@/lib/api/client';

// ============================================================================
// Public types — mirror backend DTOs in apps/backend/src/modules/finance/dto/.
// ============================================================================

export type AgingBucket = 'current' | '0-30' | '31-60' | '61-90' | '90+';

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

// ---- Dashboard --------------------------------------------------------------

export interface DashboardKpis {
  revenueInRange: number;
  spendInRange: number;
  netCashflowInRange: number;
  outstandingNow: number;
  overdueCountNow: number;
  avgDaysToCollectTrailing90: number;
}

export interface DashboardCashFlowPoint {
  month: string;
  cashIn: number;
  cashOut: number;
  net: number;
}

export interface DashboardSpendByCategory {
  category: ExpenseCategory;
  total: number;
}

export interface DashboardTopCustomer {
  customerId: string;
  customerName: string;
  outstanding: number;
}

export interface DashboardTopVendor {
  vendorKey: string;
  vendorName: string;
  totalSpend: number;
}

export interface DashboardActivityItem {
  type: 'receipt' | 'expense';
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  at: string;
}

export interface DashboardData {
  range: { from: string; to: string };
  kpis: DashboardKpis;
  cashFlowMonthly: DashboardCashFlowPoint[];
  spendByCategory: DashboardSpendByCategory[];
  topCustomersOutstanding: DashboardTopCustomer[];
  topVendorsSpend: DashboardTopVendor[];
  recentActivity: DashboardActivityItem[];
}

// ---- Receipts ledger --------------------------------------------------------

export interface OrgReceiptListItem {
  id: string;
  paymentNumber: string;
  paidAmount: number;
  expectedAmount: number;
  paymentMethod: PaymentMethod;
  status: PaymentTransactionStatus;
  paymentReference?: string | null;
  paymentTermId?: string | null;
  createdAt: string;
  reconciledAt?: string | null;
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddressLine?: string | null;
}

export interface OrgReceiptsFilters extends DateRangeFilter {
  status?: PaymentTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ---- Expenses ledger --------------------------------------------------------

export interface OrgExpenseListItem {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  vendorName?: string | null;
  amount: number;
  currency: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  paidBy: ExpensePaidByType;
  reimbursementStatus: ReimbursementStatus;
  notes?: string | null;
  createdAt: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
}

export interface OrgExpensesFilters {
  category?: ExpenseCategory;
  paidBy?: ExpensePaidByType;
  reimbursementStatus?: ReimbursementStatus;
  vendorSearch?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ---- Outstanding ------------------------------------------------------------

export interface OutstandingTerm {
  id: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerId: string;
  customerName: string;
  stage: string;
  name: string;
  dueDate?: string | null;
  expectedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PaymentTermStatus;
  daysOverdue: number | null;
  agingBucket: AgingBucket;
  createdAt: string;
}

export interface OutstandingFilters {
  bucket?: AgingBucket;
  customerId?: string;
  projectId?: string;
  search?: string;
  sort?: 'daysOverdue' | 'dueDate' | 'amount' | 'customer' | 'project';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// ---- Customers AR -----------------------------------------------------------

export interface CustomerAging {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  totalOutstanding: number;
  current: number;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90plus: number;
  lastReceiptDate?: string | null;
  openTermCount: number;
}

// ---- Vendors spend ----------------------------------------------------------

export interface VendorSpendByCategory {
  category: string;
  total: number;
}

export interface VendorSpend {
  vendorKey: string;
  vendorName: string;
  totalSpend: number;
  expenseCount: number;
  lastExpenseDate?: string | null;
  topCategory: string;
  reimbursedPercentage: number;
  byCategory: VendorSpendByCategory[];
}

export interface VendorsSpendFilters extends DateRangeFilter {
  category?: ExpenseCategory;
}

// ---- Profitability ----------------------------------------------------------

export interface ProjectProfitability {
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerId: string;
  customerName: string;
  quotedRevenue: number;
  receivedAmount: number;
  totalSpend: number;
  margin: number;
  marginPct: number;
  bomTarget: number;
  bomVariance: number;
}

/**
 * Profitability is a project-lifetime metric (no date range — see backend
 * ProfitabilityQueryDto comment). Only pagination is supported.
 */
export interface ProfitabilityFilters {
  page?: number;
  limit?: number;
}

// ============================================================================
// Cache keys — every key is keyed on organizationId so cross-org cache cannot
// leak (per frontend.mdc).
// ============================================================================

export const orgFinanceKeys = {
  root: () => ['finance-org'] as const,
  dashboard: (range: DateRangeFilter) =>
    [...orgFinanceKeys.root(), 'dashboard', range] as const,
  receipts: (filters: OrgReceiptsFilters) =>
    [...orgFinanceKeys.root(), 'receipts', filters] as const,
  expenses: (filters: OrgExpensesFilters) =>
    [...orgFinanceKeys.root(), 'expenses', filters] as const,
  outstanding: (filters: OutstandingFilters) =>
    [...orgFinanceKeys.root(), 'outstanding', filters] as const,
  customersAr: (asOfDate?: string) =>
    [...orgFinanceKeys.root(), 'customers-ar', asOfDate ?? null] as const,
  vendorsSpend: (filters: VendorsSpendFilters) =>
    [...orgFinanceKeys.root(), 'vendors-spend', filters] as const,
  profitability: (filters: ProfitabilityFilters) =>
    [...orgFinanceKeys.root(), 'profitability', filters] as const,
};

// ============================================================================
// Hooks — all read-only, all org-scoped. We use placeholderData:
// keepPreviousData so filter/page changes feel snappy (no skeleton flash).
// staleTime: 30s reduces tab-focus refetch chatter (per plan).
// ============================================================================

const STALE_MS = 30_000;

/**
 * Removes undefined values so the React-Query key doesn't churn between
 * `{}` and `{x: undefined}` (which serialize differently).
 */
function compact<T extends object>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

export function useOrgFinanceDashboard(
  range: DateRangeFilter = {},
  options?: { enabled?: boolean },
): UseQueryResult<DashboardData, AxiosError> {
  const params = compact(range);
  return useQuery({
    queryKey: orgFinanceKeys.dashboard(params),
    queryFn: async ({ signal }): Promise<DashboardData> => {
      const { data } = await apiClient.get<DashboardData>('/finance/dashboard', {
        params,
        signal,
      });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOrgReceipts(
  filters: OrgReceiptsFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedResponse<OrgReceiptListItem>, AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: orgFinanceKeys.receipts(params),
    queryFn: async ({ signal }): Promise<PaginatedResponse<OrgReceiptListItem>> => {
      const { data } = await apiClient.get<PaginatedResponse<OrgReceiptListItem>>(
        '/finance/receipts',
        { params, signal },
      );
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOrgExpenses(
  filters: OrgExpensesFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedResponse<OrgExpenseListItem>, AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: orgFinanceKeys.expenses(params),
    queryFn: async ({ signal }): Promise<PaginatedResponse<OrgExpenseListItem>> => {
      const { data } = await apiClient.get<PaginatedResponse<OrgExpenseListItem>>(
        '/finance/expenses',
        { params, signal },
      );
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOrgOutstanding(
  filters: OutstandingFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedResponse<OutstandingTerm>, AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: orgFinanceKeys.outstanding(params),
    queryFn: async ({ signal }): Promise<PaginatedResponse<OutstandingTerm>> => {
      const { data } = await apiClient.get<PaginatedResponse<OutstandingTerm>>(
        '/finance/outstanding',
        { params, signal },
      );
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOrgCustomersAr(
  asOfDate?: string,
  options?: { enabled?: boolean },
): UseQueryResult<CustomerAging[], AxiosError> {
  const params = asOfDate ? { asOfDate } : undefined;
  return useQuery({
    queryKey: orgFinanceKeys.customersAr(asOfDate),
    queryFn: async ({ signal }): Promise<CustomerAging[]> => {
      const { data } = await apiClient.get<CustomerAging[]>('/finance/customers/ar', {
        params,
        signal,
      });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOrgVendorsSpend(
  filters: VendorsSpendFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<VendorSpend[], AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: orgFinanceKeys.vendorsSpend(params),
    queryFn: async ({ signal }): Promise<VendorSpend[]> => {
      const { data } = await apiClient.get<VendorSpend[]>('/finance/vendors/spend', {
        params,
        signal,
      });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOrgProfitability(
  filters: ProfitabilityFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedResponse<ProjectProfitability>, AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: orgFinanceKeys.profitability(params),
    queryFn: async ({ signal }): Promise<PaginatedResponse<ProjectProfitability>> => {
      const { data } = await apiClient.get<PaginatedResponse<ProjectProfitability>>(
        '/finance/projects/profitability',
        { params, signal },
      );
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}
