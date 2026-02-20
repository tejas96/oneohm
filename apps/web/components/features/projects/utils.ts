import type { EmployeeListItem } from './hooks';

export function getEmployeeDisplayName(emp: EmployeeListItem): string {
  const first = emp.firstName || '';
  const last = emp.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || emp.email || 'Unknown';
}

export function getEmployeeInitials(emp: EmployeeListItem): string {
  const first = emp.firstName?.charAt(0) || '';
  const last = emp.lastName?.charAt(0) || '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
}

export function getWorkloadVariant(
  activeProjects: number,
): 'success' | 'warning' | 'error' {
  if (activeProjects <= 2) return 'success';
  if (activeProjects <= 4) return 'warning';
  return 'error';
}
