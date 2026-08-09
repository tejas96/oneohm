'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  PaginationMeta,
  ProjectMetadata,
  ProjectPriority,
  ProjectStatus,
  TaskStatusConfig,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  address?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  projectType?: string;
  /** Scopes to one customer — resolved server-side through property.customerId. */
  customerId?: string;
  /** Projects with (true) or without (false) open or in-progress tickets. */
  hasActiveTickets?: boolean;
  fromDate?: string;
  toDate?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  memberId?: string;
  pendingWorkflowStepId?: string;
  healthStatus?: string;
  createdBy?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  // Query control
  enabled?: boolean;
}

export interface TeamMemberSummary {
  id: string;
  firstName: string;
  lastName?: string;
  isProjectManager: boolean;
}

/**
 * A project's money position, in rupees, straight from the ledger view.
 *
 * `contractValue` is the number to show anywhere a project's worth is quoted:
 * the original quote plus every agreed change order. The list used to render
 * `estimatedCost` (the quote alone) under the heading "Value" while the project's
 * own Money tab showed this figure under "Contract" — both correct, neither
 * reconcilable without opening the project.
 */
export interface PaymentSummary {
  totalExpected: number;
  totalPaid: number;
  contractValue: number;
  outstanding: number;
}

export interface ProjectListItem {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  quoteId: string;
  quoteNumber?: string;
  systemSizeKw: number;
  actualSystemSizeKw?: number;
  projectType: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  /** Open or in-progress service tickets. Drives the active-tickets chip. */
  activeTicketCount: number;
  progressPercentage: number;
  totalTasks?: number;
  completedTasks?: number;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  metadata?: ProjectMetadata;
  taskStatuses?: TaskStatusConfig[];
  property: {
    id: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    customerName?: string;
  };
  teamMembers: TeamMemberSummary[];
  paymentSummary: PaymentSummary;
  currentPhase: string | null;
  healthStatus: 'on_track' | 'at_risk' | 'delayed' | null;
  createdBy?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export type { PaginationMeta };

export interface ProjectListResponse {
  data: ProjectListItem[];
  meta: PaginationMeta;
}

// ============================================================================
// Query Keys
// ============================================================================

export const projectKeys = {
  all: () => ['projects'] as const,
  lists: () => [...projectKeys.all(), 'list'] as const,
  list: (filters: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all(), 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProjects(
  filters: ProjectFilters = {},
): UseQueryResult<ProjectListResponse, AxiosError> {
  const { enabled: callerEnabled, ...queryFilters } = filters;

  return useQuery({
    queryKey: projectKeys.list(queryFilters as Record<string, unknown>),
    queryFn: async (): Promise<ProjectListResponse> => {
      const params = new URLSearchParams();

      if (queryFilters.page) params.append('page', String(queryFilters.page));
      if (queryFilters.limit) params.append('limit', String(queryFilters.limit));

      if (queryFilters.search && queryFilters.search.length >= 2) {
        params.append('search', queryFilters.search);
      }
      if (queryFilters.address) params.append('address', queryFilters.address);

      if (queryFilters.status) params.append('status', queryFilters.status);
      if (queryFilters.priority) params.append('priority', queryFilters.priority);
      if (queryFilters.projectType) params.append('projectType', queryFilters.projectType);
      if (queryFilters.fromDate) params.append('fromDate', queryFilters.fromDate);
      if (queryFilters.toDate) params.append('toDate', queryFilters.toDate);
      if (queryFilters.startDateFrom) params.append('startDateFrom', queryFilters.startDateFrom);
      if (queryFilters.startDateTo) params.append('startDateTo', queryFilters.startDateTo);
      if (queryFilters.endDateFrom) params.append('endDateFrom', queryFilters.endDateFrom);
      if (queryFilters.endDateTo) params.append('endDateTo', queryFilters.endDateTo);
      if (queryFilters.customerId) params.append('customerId', queryFilters.customerId);
      if (queryFilters.hasActiveTickets !== undefined)
        params.append('hasActiveTickets', String(queryFilters.hasActiveTickets));
      if (queryFilters.memberId) params.append('memberId', queryFilters.memberId);
      if (queryFilters.pendingWorkflowStepId)
        params.append('pendingWorkflowStepId', queryFilters.pendingWorkflowStepId);
      if (queryFilters.healthStatus) params.append('healthStatus', queryFilters.healthStatus);
      if (queryFilters.createdBy) params.append('createdBy', queryFilters.createdBy);
      if (queryFilters.sortBy) params.append('sortBy', queryFilters.sortBy);
      if (queryFilters.sortOrder) params.append('sortOrder', queryFilters.sortOrder);

      const response = await apiClient.get<ProjectListResponse>(
        `/projects?${params.toString()}`,
        {},
      );
      return response.data as ProjectListResponse;
    },
    enabled: callerEnabled !== false,
    placeholderData: keepPreviousData,
  });
}
