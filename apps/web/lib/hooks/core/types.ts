import type { PaginationMeta } from '@oneohm-epc/shared/types';
import type { UseMutationResult } from '@tanstack/react-query';

// ── Filter Types ──────────────────────────────────────────────

export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// ── Response Types ────────────────────────────────────────────

export interface ResourceListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── Error Types ───────────────────────────────────────────────

export interface NormalizedError {
  message: string;
  code?: string;
  status?: number;
  validationErrors?: Array<{ field: string; message: string }>;
  raw: unknown;
}

// ── Resource Configuration ────────────────────────────────────

export interface ResourceConfig<T = unknown, F extends BaseFilters = BaseFilters> {
  resource: string;
  endpoint: string;
  defaultFilters?: Partial<F>;
  defaultSort?: { field: string; order: 'ASC' | 'DESC' };
  defaultPageSize?: number;
  minSearchLength?: number;
  searchDebounceMs?: number;
  syncToUrl?: boolean;
  persistFilters?: boolean;
  requiresOrg?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  paramMapping?: Record<string, string>;
  responseAdapter?: (raw: unknown) => ResourceListResponse<T>;
  permissions?: ResourcePermissionConfig;
}

export interface ResourcePermissionConfig {
  view?: string;
  create?: string;
  update?: string;
  delete?: string;
  archive?: string;
  bulkDelete?: string;
}

// ── Nested/Sub-Resource Configuration ─────────────────────────

export interface SubResourceConfig<T = unknown, F extends BaseFilters = BaseFilters> {
  resource: string;
  endpoint: string;
  parentResource: string;
  parentIdParam?: string;
  parentIdInPath?: boolean;
  defaultFilters?: Partial<F>;
  requiresOrg?: boolean;
  staleTime?: number;
  responseAdapter?: (raw: unknown) => ResourceListResponse<T>;
}

// ── Mutation Configuration ────────────────────────────────────

export interface MutationConfig<T = unknown> {
  resource: string;
  endpoint: string;
  requiresOrg?: boolean;
  endpoints?: {
    create?: string;
    update?: string;
    delete?: string;
    archive?: string;
    bulkDelete?: string;
    statusChange?: string;
  };
  customActions?: Record<
    string,
    {
      method: 'POST' | 'PATCH' | 'PUT';
      path: (id: string) => string;
    }
  >;
  optimistic?: OptimisticConfig<T>;
  toast?: MutationToastConfig;
  invalidateRelated?: readonly string[];
}

export interface OptimisticConfig<T> {
  create?: (payload: Partial<T>, list: T[]) => T[];
  update?: (id: string, payload: Partial<T>, list: T[]) => T[];
  delete?: (id: string, list: T[]) => T[];
}

export interface MutationToastConfig {
  create?: { success?: string; error?: string };
  update?: { success?: string; error?: string };
  delete?: { success?: string; error?: string };
  archive?: { success?: string; error?: string };
  statusChange?: { success?: string; error?: string };
  [action: string]: { success?: string; error?: string } | undefined;
}

// ── Stats/Counts Configuration ────────────────────────────────

export interface StatsConfig<TStats = Record<string, number>> {
  resource: string;
  endpoint: string;
  requiresOrg?: boolean;
  staleTime?: number;
  transform?: (raw: unknown) => TStats;
}

// ── Field Availability Configuration ──────────────────────────

export interface FieldAvailabilityConfig {
  endpoint: string;
  excludeIdParam?: string;
  extraParams?: Record<string, string>;
  validateResponse?: (field: string, data: unknown) => string | null;
}

// ── Companion Hook Types ──────────────────────────────────────

export interface DeleteConfirmationOptions<T> {
  mutation: UseMutationResult<unknown, unknown, string>;
  getId: (item: T) => string;
  /** @deprecated No longer used — kept for backward compatibility */
  entityName?: string;
  onSuccess?: () => void;
}

export interface ModalFormOptions<TForm extends Record<string, unknown>, TPayload = TForm> {
  mutation: UseMutationResult<unknown, unknown, TPayload>;
  transformPayload?: (data: TForm) => TPayload;
  onSuccess?: () => void;
}

// ── Pagination State ──────────────────────────────────────────

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ── Sorting State ─────────────────────────────────────────────

export interface SortingState {
  sortBy: string | undefined;
  sortOrder: 'ASC' | 'DESC';
  setSorting: (field: string, order?: 'ASC' | 'DESC') => void;
  toggleSort: (field: string) => void;
  clearSort: () => void;
}

// ── Resource Events ───────────────────────────────────────────

export type ResourceEventType = 'created' | 'updated' | 'deleted' | 'archived' | 'bulkDeleted';

export interface ResourceEvent<T = unknown> {
  resource: string;
  type: ResourceEventType;
  data?: T;
  id?: string;
  ids?: string[];
  timestamp: number;
}

// ── Query Selector ────────────────────────────────────────────

export type ResourceSelector<T, R> = (data: ResourceListResponse<T>) => R;
