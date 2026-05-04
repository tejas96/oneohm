'use client';

import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { EmployeeRow } from './employee-row';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import type { EmployeeListItem, TeamWorkloadItem } from '@/lib/hooks/resources';

// ── Types ──────────────────────────────────────────────────────

export interface TeamMember {
  userId: string;
  roleName: string;
  isProjectManager?: boolean;
}

interface SelectedTeamListProps {
  teamMembers: TeamMember[];
  projectManagerId: string;
  employees: EmployeeListItem[];
  workloadMap: Map<string, TeamWorkloadItem>;
  onRemove: (userId: string) => void;
  onTogglePm: (userId: string) => void;
  /** When provided, returns true for userIds whose remove button should be disabled. */
  disableRemove?: (userId: string) => boolean;
  /** Tooltip shown when remove is disabled for a user. */
  disableRemoveTooltip?: string;
}

// ── Component ─────────────────────────────────────────────────

export function SelectedTeamList({
  teamMembers,
  projectManagerId,
  employees,
  workloadMap,
  onRemove,
  onTogglePm,
  disableRemove,
  disableRemoveTooltip = 'Cannot remove this member',
}: SelectedTeamListProps): React.JSX.Element {
  if (teamMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MUITypography variant="body" className="text-foreground-secondary">
          No team members added yet.
        </MUITypography>
        <MUITypography variant="finePrint" className="text-foreground-secondary mt-1">
          Search and add members from the right panel.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-light">
      {teamMembers.map((member) => {
        const emp = employees.find((e) => e.userId === member.userId);
        const isPm = projectManagerId === member.userId;
        const workload = workloadMap.get(member.userId);
        const isRemoveDisabled = disableRemove?.(member.userId) ?? false;

        return (
          <div key={member.userId} className="p-3">
            <EmployeeRow
              employee={
                emp ??
                ({
                  userId: member.userId,
                  id: '',
                  organizationId: '',
                  status: 'active',
                } as EmployeeListItem)
              }
              workload={workload}
              rightSlot={
                <div className="flex items-center gap-1">
                  {isPm && <MUIStatusChip label="PM" color="warning" size="small" />}
                  <Tooltip title={isPm ? 'Remove Project Manager' : 'Set as Project Manager'}>
                    <IconButton
                      size="small"
                      onClick={() => onTogglePm(member.userId)}
                      aria-label={isPm ? 'Remove Project Manager' : 'Set as Project Manager'}
                    >
                      {isPm ? (
                        <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                      ) : (
                        <StarBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isRemoveDisabled ? disableRemoveTooltip : 'Remove member'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => !isRemoveDisabled && onRemove(member.userId)}
                        aria-label="Remove team member"
                        disabled={isRemoveDisabled}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
