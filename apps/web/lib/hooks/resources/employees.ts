'use client';

import {
  defineResource,
  getResourceConfig,
  useResourceList,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

import type {
  EmployeeListItem,
  EmployeeUser,
} from '@/components/features/projects/hooks/use-employees';

// ── Types ──────────────────────────────────────────────────────

export type { EmployeeListItem, EmployeeUser };

export interface EmployeeFilters extends BaseFilters {
  status?: string;
  department?: string;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<EmployeeListItem>(
  'employees',
  {
    endpoint: '/employees',
    defaultPageSize: 100,
    syncToUrl: false,
  },
  {
    view: 'employees:read',
    create: 'employees:create',
    update: 'employees:update',
    delete: 'employees:delete',
  },
);

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Fetch employees list with optional filters.
 * Used by the project creation wizard team selection step.
 */
export function useEmployees(
  filters?: Partial<EmployeeFilters>,
): ReturnType<typeof useResourceList<EmployeeListItem, EmployeeFilters>> {
  const config = getResourceConfig('employees') as ResourceConfig<
    EmployeeListItem,
    EmployeeFilters
  >;
  return useResourceList<EmployeeListItem, EmployeeFilters>({
    ...config,
    defaultFilters: filters as Partial<EmployeeFilters>,
    syncToUrl: false,
  });
}
