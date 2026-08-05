import { getRolePresentation } from '@tejas96/shared';

import type { EmployeeListItem } from './hooks';

export function getEmployeeDisplayName(emp: EmployeeListItem): string {
  const first = emp.user?.firstName || '';
  const last = emp.user?.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || emp.user?.email || emp.email || 'Unknown';
}

export function getEmployeeInitials(emp: EmployeeListItem): string {
  const first = emp.user?.firstName?.charAt(0) || '';
  const last = emp.user?.lastName?.charAt(0) || '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
}

export function getWorkloadVariant(activeProjects: number): 'success' | 'warning' | 'error' {
  if (activeProjects <= 2) return 'success';
  if (activeProjects <= 4) return 'warning';
  return 'error';
}

export function getDisplayRoles(roles?: string[]): string[] {
  if (!roles) return [];
  return roles
    .filter((role) => role !== 'employee_basic')
    .map((role) => getRolePresentation(role).label);
}
