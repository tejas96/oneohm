'use client';

import GroupsIcon from '@mui/icons-material/Groups';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { AvailableEmployeesList } from './available-employees-list';
import { SelectedTeamList, type TeamMember } from './selected-team-list';
import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';
import { getDisplayRoles } from '../../../utils';

import { MUITypography } from '@/components/ui';
import type { EmployeeListItem, TeamWorkloadItem } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface TeamSplitPanelProps {
  form: UseFormReturn<ProjectCreateFormData>;
  employees: EmployeeListItem[];
  workloadMap: Map<string, TeamWorkloadItem>;
}

// ── Component ─────────────────────────────────────────────────

export function TeamSplitPanel({
  form,
  employees,
  workloadMap,
}: TeamSplitPanelProps): React.JSX.Element {
  const { setValue, watch } = form;
  const teamMembers: TeamMember[] = watch('teamMembers');
  const projectManagerId = watch('projectManagerId') ?? '';

  const selectedUserIds = useMemo(() => new Set(teamMembers.map((m) => m.userId)), [teamMembers]);

  function handleAdd(emp: EmployeeListItem): void {
    if (selectedUserIds.has(emp.userId)) return;
    const displayRoles = getDisplayRoles(emp.roles);
    const autoRole =
      displayRoles.length > 0 ? displayRoles.join(', ') : (emp.designation ?? 'Team Member');
    const updated: TeamMember[] = [
      ...teamMembers,
      { userId: emp.userId, roleName: autoRole, isProjectManager: false },
    ];
    setValue('teamMembers', updated, { shouldValidate: true });
  }

  function handleRemove(userId: string): void {
    const updated = teamMembers.filter((m) => m.userId !== userId);
    setValue('teamMembers', updated, { shouldValidate: true });

    // Clear PM if removed
    if (projectManagerId === userId) {
      setValue('projectManagerId', '');
    }

    // Clear task assignments referencing removed user
    const currentAssignments = form.getValues('taskAssignments');
    const filtered = currentAssignments.filter((a) => a.assignedToUserId !== userId);
    if (filtered.length !== currentAssignments.length) {
      setValue('taskAssignments', filtered);
    }
  }

  function handleTogglePm(userId: string): void {
    const isPm = projectManagerId === userId;
    setValue('projectManagerId', isPm ? '' : userId);

    // Update isProjectManager flags and auto-set role
    const updated = teamMembers.map((m) =>
      m.userId === userId
        ? { ...m, isProjectManager: !isPm, roleName: !isPm ? 'Project Manager' : m.roleName }
        : { ...m, isProjectManager: false },
    );
    setValue('teamMembers', updated);
  }

  return (
    <div className="flex rounded-lg overflow-hidden shadow-e1" style={{ height: 520 }}>
      {/* Left panel — selected team */}
      <div className="flex flex-col w-1/2 border-r border-border-light min-h-0">
        <div className="flex-shrink-0 px-4 py-3 bg-background-secondary">
          <div className="flex items-center gap-2">
            <GroupsIcon fontSize="small" className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Selected Team</MUITypography>
            <div className="ml-auto">
              <MUITypography variant="finePrint" className="text-foreground-secondary">
                {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
              </MUITypography>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <SelectedTeamList
            teamMembers={teamMembers}
            projectManagerId={projectManagerId}
            employees={employees}
            workloadMap={workloadMap}
            onRemove={handleRemove}
            onTogglePm={handleTogglePm}
          />
        </div>
      </div>

      {/* Right panel — available employees */}
      <div className="flex flex-col w-1/2 min-h-0">
        <div className="flex-shrink-0 px-4 py-3 bg-background-secondary">
          <MUITypography variant="sectionTitle">All Employees</MUITypography>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <AvailableEmployeesList
            employees={employees}
            selectedUserIds={selectedUserIds}
            workloadMap={workloadMap}
            onAdd={handleAdd}
          />
        </div>
      </div>
    </div>
  );
}
