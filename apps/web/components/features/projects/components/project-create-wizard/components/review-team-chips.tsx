'use client';

import StarIcon from '@mui/icons-material/Star';

import { getEmployeeDisplayName, getEmployeeInitials } from '../../../utils';

import { MUIAvatar, MUIStatusChip, MUITypography } from '@/components/ui';
import type { EmployeeListItem } from '@/lib/hooks/resources';

// ── Types ──────────────────────────────────────────────────────

interface TeamMemberForReview {
  userId: string;
  roleName: string;
  isProjectManager?: boolean;
}

interface ReviewTeamChipsProps {
  teamMembers: TeamMemberForReview[];
  projectManagerId: string;
  employees: EmployeeListItem[];
}

// ── Component ─────────────────────────────────────────────────

export function ReviewTeamChips({
  teamMembers,
  projectManagerId,
  employees,
}: ReviewTeamChipsProps): React.JSX.Element {
  if (teamMembers.length === 0) {
    return (
      <MUITypography variant="body" className="text-foreground-secondary">
        No team members added.
      </MUITypography>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {teamMembers.map((member) => {
        const emp = employees.find((e) => e.userId === member.userId);
        const name = emp ? getEmployeeDisplayName(emp) : member.roleName || 'Unknown';
        const initials = emp ? getEmployeeInitials(emp) : '?';
        const isPm = projectManagerId === member.userId;

        return (
          <div
            key={member.userId}
            className="flex items-center gap-2 px-3 py-1.5 border border-border-light rounded-lg bg-background-secondary"
          >
            <div className="relative">
              <MUIAvatar name={name} initials={initials} size="xs" />
              {isPm && (
                <div className="absolute -top-1 -right-1">
                  <StarIcon sx={{ fontSize: 10, color: 'warning.main' }} />
                </div>
              )}
            </div>
            <div>
              <MUITypography variant="finePrint">{name}</MUITypography>
              {isPm && <MUIStatusChip label="PM" color="warning" size="small" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
