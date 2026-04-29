'use client';

import type {
  PaginationMeta,
  ProjectMetadata,
  ProjectPriority,
  ProjectStatus,
  TaskStatusConfig,
} from '@oneohm-epc/shared/types';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  projectType?: string;
  fromDate?: string;
  toDate?: string;
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

export interface PaymentSummary {
  totalExpected: number;
  totalPaid: number;
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
  progressPercentage: number;
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
    customerName?: string;
  };
  teamMembers: TeamMemberSummary[];
  paymentSummary: PaymentSummary;
  currentPhase: string | null;
  healthStatus: 'on_track' | 'at_risk' | 'delayed' | null;
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
  all: (orgId?: string) => ['projects', orgId] as const,
  lists: (orgId?: string) => [...projectKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...projectKeys.lists(orgId), filters] as const,
  details: (orgId?: string) => [...projectKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...projectKeys.details(orgId), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProjects(
  filters: ProjectFilters = {},
): UseQueryResult<ProjectListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const { enabled: callerEnabled, ...queryFilters } = filters;

  return useQuery({
    queryKey: projectKeys.list(organizationId, queryFilters as Record<string, unknown>),
    queryFn: async (): Promise<ProjectListResponse> => {
      const params = new URLSearchParams();

      if (queryFilters.page) params.append('page', String(queryFilters.page));
      if (queryFilters.limit) params.append('limit', String(queryFilters.limit));

      if (queryFilters.search && queryFilters.search.length >= 2) {
        params.append('search', queryFilters.search);
      }

      if (queryFilters.status) params.append('status', queryFilters.status);
      if (queryFilters.priority) params.append('priority', queryFilters.priority);
      if (queryFilters.projectType) params.append('projectType', queryFilters.projectType);
      if (queryFilters.fromDate) params.append('fromDate', queryFilters.fromDate);
      if (queryFilters.toDate) params.append('toDate', queryFilters.toDate);
      if (queryFilters.sortBy) params.append('sortBy', queryFilters.sortBy);
      if (queryFilters.sortOrder) params.append('sortOrder', queryFilters.sortOrder);

      const response = await apiClient.get<ProjectListResponse>(`/projects?${params.toString()}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return response.data as ProjectListResponse;
    },
    enabled: !!organizationId && callerEnabled !== false,
    placeholderData: keepPreviousData,
  });
}
