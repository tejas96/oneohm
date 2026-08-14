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

const ROLE_LABELS: Record<string, string> = {
  design_engineer: 'Design',
  execution: 'Execution',
  liaisoning: 'Liaisoning',
  loan: 'Loan',
  store: 'Store',
  field_worker: 'Field',
  sales_person: 'Sales',
  telecaller: 'Telecaller',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export function getDisplayRoles(roles?: string[]): string[] {
  if (!roles) return [];
  // The `employee_basic` filter that used to live here is gone with the role
  // itself (migration 1855100000000). It existed because that role was on
  // nearly everyone and said nothing; there is no longer anything to hide.
  return roles.map((r) => ROLE_LABELS[r] || r.replace(/_/g, ' '));
}
