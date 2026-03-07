'use client';

import type { StatisticsResponse, WorkflowStep } from '@oneohm-epc/shared-types';

import {
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  useResourceDetail,
  useResourceList,
  useResourceMutations,
  useResourcePermissions,
  useResourceStats,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

// ── Types ──────────────────────────────────────────────────────

export type { WorkflowStep };

export interface WorkflowStepFilters extends BaseFilters {
  isActive?: boolean;
  type?: string;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<WorkflowStep>(
  'workflow-steps',
  {
    endpoint: '/workflow-steps',
    defaultPageSize: 10,
    syncToUrl: true,
    defaultSort: { field: 'sequenceOrder', order: 'ASC' },
  },
  {
    view: 'workflow-steps:read',
    create: 'workflow-steps:create',
    update: 'workflow-steps:update',
    delete: 'workflow-steps:delete',
  },
);

// ── Hooks ──────────────────────────────────────────────────────

export function useWorkflowSteps(
  overrides?: Partial<ResourceConfig<WorkflowStep, WorkflowStepFilters>>,
): ReturnType<typeof useResourceList<WorkflowStep, WorkflowStepFilters>> {
  const config = getResourceConfig('workflow-steps') as ResourceConfig<
    WorkflowStep,
    WorkflowStepFilters
  >;
  return useResourceList<WorkflowStep, WorkflowStepFilters>({ ...config, ...overrides });
}

export function useAllActiveWorkflowSteps(): ReturnType<
  typeof useResourceList<WorkflowStep, WorkflowStepFilters>
> {
  return useResourceList<WorkflowStep, WorkflowStepFilters>({
    resource: 'workflow-steps-ref',
    endpoint: '/workflow-steps',
    defaultPageSize: 200,
    syncToUrl: false,
    staleTime: 5 * 60 * 1000,
    defaultFilters: { isActive: true } as Partial<WorkflowStepFilters>,
    defaultSort: { field: 'sequenceOrder', order: 'ASC' },
  });
}

export function useWorkflowStep(id: string): ReturnType<typeof useResourceDetail<WorkflowStep>> {
  return useResourceDetail<WorkflowStep>({
    resource: 'workflow-steps',
    endpoint: '/workflow-steps',
    id,
  });
}

export function useWorkflowStepMutations(): ReturnType<typeof useResourceMutations<WorkflowStep>> {
  return useResourceMutations<WorkflowStep>({
    resource: 'workflow-steps',
    endpoint: '/workflow-steps',
    customActions: {
      toggleStatus: {
        method: 'PATCH',
        path: (id) => `/workflow-steps/${id}/toggle-status`,
      },
    },
    toast: {
      create: { success: 'Workflow step created', error: 'Failed to create workflow step' },
      update: { success: 'Workflow step updated', error: 'Failed to update workflow step' },
      delete: { success: 'Workflow step deleted', error: 'Failed to delete workflow step' },
      toggleStatus: { success: 'Step status toggled', error: 'Failed to toggle step status' },
    },
  });
}

export function useWorkflowStepStats(): ReturnType<typeof useResourceStats<StatisticsResponse>> {
  return useResourceStats<StatisticsResponse>({
    resource: 'workflow-steps',
    endpoint: '/workflow-steps/stats/summary',
  });
}

export function useWorkflowStepPermissions(): ReturnType<typeof useResourcePermissions> {
  return useResourcePermissions(getResourcePermissions('workflow-steps'));
}
