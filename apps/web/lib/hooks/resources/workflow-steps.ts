'use client';

import type { StatisticsResponse, WorkflowStep } from '@tejas96/shared/types';

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

// The active-only reference list is cached under its own resource key, so a
// mutation on 'workflow-steps' does not touch it unless we say so.
const WORKFLOW_STEPS_REF = 'workflow-steps-ref';

// ── Resource Registration ──────────────────────────────────────

defineResource<WorkflowStep>(
  'workflow-steps',
  {
    endpoint: '/workflow-steps',
    defaultPageSize: 10,
    syncToUrl: true,
    defaultSort: { field: 'sequenceOrder', order: 'ASC' },
  },
  // No permission codes. Admin screens are gated as a whole by
  // SUPERADMIN_ONLY in route-map.ts, so a per-resource code would
  // gate nothing extra.
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

/**
 * The active-only catalogue every consumer of workflow steps reads: the project
 * create wizard, the projects list filter, and the admin dependency picker. Only
 * these steps become tasks on a new project, so a deactivated step has to leave
 * this list -- see WORKFLOW_STEPS_REF in the mutations' invalidateRelated.
 */
export function useAllActiveWorkflowSteps(): ReturnType<
  typeof useResourceList<WorkflowStep, WorkflowStepFilters>
> {
  return useResourceList<WorkflowStep, WorkflowStepFilters>({
    resource: WORKFLOW_STEPS_REF,
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
    // Activating, deactivating, editing or deleting a step changes which steps a
    // new project gets. Without this the wizard keeps offering a step it can no
    // longer create, for the whole staleTime window.
    invalidateRelated: [WORKFLOW_STEPS_REF],
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
