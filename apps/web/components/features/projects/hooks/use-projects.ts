'use client';

import type { ProjectMetadata, ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
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
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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
  projectType: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  metadata?: ProjectMetadata;
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

  return useQuery({
    queryKey: projectKeys.list(organizationId, filters as Record<string, unknown>),
    queryFn: async (): Promise<ProjectListResponse> => {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      if (filters.search && filters.search.length >= 2) {
        params.append('search', filters.search);
      }

      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.projectType) params.append('projectType', filters.projectType);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const { data } = await apiClient.get<ProjectListResponse>(`/projects?${params.toString()}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });
}
