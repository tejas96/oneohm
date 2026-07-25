'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, TaskPriority } from '@tejas96/shared/types';

import {
  createResourceKeys,
  defineResource,
  STALE_TIMES,
  useOrgContext,
  useMutationWithToast,
} from '../core';

import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export interface ActivityFeedItem {
  taskId: string;
  taskCode: string;
  taskName: string;
  activityType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

export interface TeamWorkloadEntry {
  userId: string;
  userName: string;
  tasksByStatus: Record<string, number>;
  totalTasks: number;
  completedTasks: number;
  workloadPercent: number;
}

export interface MilestoneProgressEntry {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  percent: number;
}

export interface UpcomingDeadline {
  id: string;
  name: string;
  endDate: string;
}

export interface ProjectSummaryMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  unassignedTasks: number;
  completionPercentage: number;
  upcomingDeadlines: UpcomingDeadline[];
}

export interface ProjectSummary {
  metrics: ProjectSummaryMetrics;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  recentActivity: ActivityFeedItem[];
  teamWorkload: TeamWorkloadEntry[];
  milestoneProgress: MilestoneProgressEntry[];
}

// ── Task Types ─────────────────────────────────────────────────
// Canonical types for the project tasks sub-resource.
// The feature-folder types.ts re-exports these to avoid duplication.

export interface ProjectTaskItem {
  id: string;
  code: string;
  name: string;
  status: string;
  priority: TaskPriority;
  assignedToUserId?: string;
  assigneeName?: string;
  milestoneName?: string | null;
  milestoneOrder?: number | null;
  startDate?: string;
  endDate?: string;
  completionPercentage: number;
  labels?: string[];
  blockedReason?: string;
  hasDependencyBlockers?: boolean;
  isSpecial?: boolean;
  changeRequestType?: string;
}

export interface ProjectTaskListParams {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  assignedToUserId?: string;
  milestoneName?: string;
  search?: string;
}

// ── Resource Registration ──────────────────────────────────────
// FDAL entry point for the projects entity.
// Existing feature hooks remain in their feature folder until migrated.

defineResource(
  'projects',
  { endpoint: '/projects', defaultPageSize: 20, syncToUrl: true },
  {
    view: 'projects:read',
    create: 'projects:create',
    update: 'projects:update',
    delete: 'projects:delete',
  },
);

// ── Summary Hook ───────────────────────────────────────────────
// Follows the useLookupsByTypeCode pattern: direct useQuery + FDAL primitives.
// useResourceStats is not used — it lacks an `enabled` option to gate
// the query when the tab is inactive.

const summaryKeys = createResourceKeys('project-summary');

export function useProjectSummary(
  projectId: string,
  options?: { enabled?: boolean },
): {
  data: ProjectSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const { orgHeaders, isReady } = useOrgContext();

  const query = useQuery<ProjectSummary>({
    queryKey: summaryKeys.detail(undefined, projectId),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProjectSummary>(
        `/projects/${projectId}/analytics/summary`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: !!projectId && isReady && options?.enabled !== false,
    staleTime: STALE_TIMES.fast,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ── Task List Hook ──────────────────────────────────────────────
// Paginated, filtered list of tasks for a single project.
// Uses useOrgContext (FDAL) instead of raw useAuth — orgHeaders
// carry the X-Organization-Id header automatically.

const taskListKeys = createResourceKeys('project-tasks');

export function useProjectTaskList(
  projectId: string,
  params: ProjectTaskListParams,
  options?: { enabled?: boolean },
): {
  data: PaginatedResponse<ProjectTaskItem> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const { orgHeaders, organizationId, isReady } = useOrgContext();

  const query = useQuery<PaginatedResponse<ProjectTaskItem>>({
    queryKey: taskListKeys.list(organizationId, { projectId, ...params }),
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      qs.set('page', String(params.page));
      qs.set('limit', String(params.limit));
      if (params.status) qs.set('status', params.status);
      if (params.priority) qs.set('priority', params.priority);
      if (params.assignedToUserId) qs.set('assignedToUserId', params.assignedToUserId);
      if (params.milestoneName) qs.set('milestoneName', params.milestoneName);
      if (params.search) qs.set('search', params.search);

      const { data } = await apiClient.get<PaginatedResponse<ProjectTaskItem>>(
        `/projects/${projectId}/tasks?${qs.toString()}`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: !!projectId && isReady && options?.enabled !== false,
    staleTime: STALE_TIMES.fast,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ── Convert From Quote ──────────────────────────────────────────

export type { ConvertFromQuotePayload } from '../../../components/features/projects/hooks/use-create-project';

export interface ProjectResponse {
  id: string;
  projectNumber: string;
  name: string;
  [key: string]: unknown;
}

const projectResourceKeys = createResourceKeys('projects');
const quoteResourceKeysForConvert = createResourceKeys('quotes');
const propertyResourceKeysForConvert = createResourceKeys('customer-properties');

/**
 * FDAL mutation to convert a quote into a project.
 * Uses useMutation + useMutationWithToast (NOT useResourceMutations — custom endpoint).
 * Endpoint: POST /projects/convert-from-quote/:quoteId
 */
export interface UseConvertFromQuoteReturn {
  execute: (variables: {
    quoteId: string;
    payload: import('../../../components/features/projects/hooks/use-create-project').ConvertFromQuotePayload;
  }) => Promise<ProjectResponse>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Update the project's default warehouse.
 * Locked at the server side once any active allocation exists (returns 409).
 */
export function useUpdateProjectWarehouse() {
  const queryClient = useQueryClient();
  const { orgHeaders, organizationId } = useOrgContext();

  const mutation = useMutation<void, unknown, { projectId: string; warehouseId: string | null }>({
    mutationFn: async ({ projectId, warehouseId }) => {
      await apiClient.patch(
        `/projects/${projectId}`,
        { defaultWarehouseId: warehouseId },
        { headers: orgHeaders },
      );
    },
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: projectResourceKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: [...projectResourceKeys.all(organizationId), projectId],
      });
    },
  });

  return {
    ...mutation,
    execute: (projectId: string, warehouseId: string | null) =>
      mutation.mutateAsync({ projectId, warehouseId }),
  };
}

export function useConvertFromQuote(): UseConvertFromQuoteReturn {
  const { orgHeaders, organizationId } = useOrgContext();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ProjectResponse,
    unknown,
    {
      quoteId: string;
      payload: import('../../../components/features/projects/hooks/use-create-project').ConvertFromQuotePayload;
    }
  >({
    mutationFn: async ({ quoteId, payload }) => {
      const { data } = await apiClient.post<ProjectResponse>(
        `/projects/convert-from-quote/${quoteId}`,
        payload,
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectResourceKeys.lists(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: quoteResourceKeysForConvert.lists(organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: propertyResourceKeysForConvert.lists(organizationId),
      });
    },
  });

  return useMutationWithToast({
    mutation,
    successMessage: 'Project created successfully',
  });
}

// ── Project List Hook (FDAL) ───────────────────────────────────

export interface ProjectListItem {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  quoteId?: string | null;
  [key: string]: unknown;
}

export interface ProjectListFilters {
  page?: number;
  limit?: number;
  status?: string;
  [key: string]: unknown;
}

export function useProjectListResource(filters: ProjectListFilters = {}) {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useQuery({
    queryKey: projectResourceKeys.list(organizationId, filters),
    queryFn: async ({ signal }): Promise<PaginatedResponse<ProjectListItem>> => {
      const params = new URLSearchParams();
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 100)); // Standard limit for aggregation
      if (filters.status) params.set('status', filters.status);

      const { data } = await apiClient.get<PaginatedResponse<ProjectListItem>>(
        `/projects?${params.toString()}`,
        {
          headers: orgHeaders,
          signal,
        },
      );
      return data;
    },
    enabled: isReady,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIMES.fast,
  });
}
