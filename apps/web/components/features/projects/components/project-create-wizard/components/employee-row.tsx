'use client';

import {
  getDisplayRoles,
  getEmployeeDisplayName,
  getEmployeeInitials,
  getWorkloadVariant,
} from '../../../utils';

import { MUIAvatar, MUIStatusChip, MUITypography } from '@/components/ui';
import type { EmployeeListItem, TeamWorkloadItem } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface EmployeeRowBaseProps {
  employee: EmployeeListItem;
  workload?: TeamWorkloadItem;
  rightSlot: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────

export function EmployeeRow({
  employee,
  workload,
  rightSlot,
}: EmployeeRowBaseProps): React.JSX.Element {
  const displayName = getEmployeeDisplayName(employee);
  const initials = getEmployeeInitials(employee);
  const displayRoles = getDisplayRoles(employee.roles);
  const subtitle =
    displayRoles.length > 0
      ? displayRoles.join(', ')
      : (employee.designation ?? employee.department ?? '');

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-background-secondary transition-colors rounded-lg">
      <MUIAvatar name={displayName} initials={initials} size="sm" />
      <div className="flex-1 min-w-0">
        <MUITypography variant="bodyPrimary" noWrap>
          {displayName}
        </MUITypography>
        {subtitle && (
          <MUITypography variant="timestamp" className="text-foreground-secondary" noWrap>
            {subtitle}
          </MUITypography>
        )}
        {workload && (
          <MUITypography variant="finePrint" className="text-foreground-secondary">
            {workload.activeProjectCount} projects · {workload.totalTaskCount} tasks
          </MUITypography>
        )}
      </div>
      {workload && (
        <MUIStatusChip
          label={`${workload.activeProjectCount}P`}
          color={getWorkloadVariant(workload.activeProjectCount)}
          size="small"
        />
      )}
      <div className="flex-shrink-0">{rightSlot}</div>
    </div>
  );
}
