'use client';

import AddIcon from '@mui/icons-material/Add';
import ChecklistIcon from '@mui/icons-material/Checklist';
import Alert from '@mui/material/Alert';
import MuiButton from '@mui/material/Button';
import { MilestoneType } from '@oneohm-epc/shared/types';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';
import { getDisplayRoles, getEmployeeDisplayName } from '../../../utils';
import { MilestoneTaskGroup, type MilestoneGroup } from '../components/milestone-task-group';
import type {
  TaskAssignment,
  TaskMilestoneOverride,
  TeamMemberOption,
} from '../components/task-row-wizard';

import { MUITypography } from '@/components/ui';
import { useAllActiveWorkflowSteps, useEmployees } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface Step5TasksMilestonesProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

// ── Component ─────────────────────────────────────────────────

export function Step5TasksMilestones({ form }: Step5TasksMilestonesProps): React.JSX.Element {
  const { setValue, watch } = form;

  const milestones: MilestoneGroup[] = watch('milestones');
  const excludedStepIds: string[] = watch('excludedStepIds');
  const taskAssignments: TaskAssignment[] = watch('taskAssignments');
  const taskMilestoneOverrides: TaskMilestoneOverride[] = watch('taskMilestoneOverrides');
  const teamMembers = watch('teamMembers');

  const { items: templates, isLoading: stepsLoading } = useAllActiveWorkflowSteps();
  const { items: employees } = useEmployees({ status: 'active' });

  // Build team member options for assignee dropdown
  const teamMemberOptions: TeamMemberOption[] = useMemo(() => {
    return teamMembers.map((m) => {
      const emp = employees.find((e) => e.userId === m.userId);
      return {
        value: m.userId,
        label: emp ? getEmployeeDisplayName(emp) : m.roleName || m.userId,
      };
    });
  }, [teamMembers, employees]);

  // Build member role map for auto-assignment hints (roleCode → userId)
  const memberRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) {
      if (!teamMembers.some((m) => m.userId === emp.userId)) continue;
      for (const role of emp.roles ?? []) {
        if (!map.has(role.toLowerCase())) map.set(role.toLowerCase(), emp.userId);
      }
    }
    return map;
  }, [teamMembers, employees]);

  // Build userId → display role labels for assignee dropdown secondary text
  const userRoleLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) {
      if (!teamMembers.some((m) => m.userId === emp.userId)) continue;
      const labels = getDisplayRoles(emp.roles);
      if (labels.length > 0) map.set(emp.userId, labels.join(', '));
    }
    return map;
  }, [teamMembers, employees]);

  // Group tasks by milestone based on overrides or default milestone type
  const milestoneToTasks = useMemo(() => {
    const map = new Map<string, typeof templates>();
    milestones.forEach((m) => map.set(m.id, []));

    for (const step of templates) {
      const override = taskMilestoneOverrides.find((o) => o.workflowStepId === step.id);
      if (override) {
        const target = milestones.find((m) => m.order === override.milestoneOrder);
        if (target) {
          map.get(target.id)?.push(step);
          continue;
        }
      }
      // Default: match by milestone type
      const milestone =
        milestones.find((m) => m.type === step.defaultMilestoneType) ?? milestones[0];
      if (milestone) map.get(milestone.id)?.push(step);
    }
    return map;
  }, [templates, milestones, taskMilestoneOverrides]);

  const milestoneOptions = milestones.map((m) => ({
    value: m.id,
    label: m.name,
    order: m.order,
  }));

  const unassignedCount = useMemo(() => {
    return templates
      .filter((t) => !excludedStepIds.includes(t.id))
      .filter((t) => {
        if (taskAssignments.some((a) => a.workflowStepId === t.id)) return false;
        if (!t.defaultRoleCode) return true;
        return !memberRoleMap.has(t.defaultRoleCode.toLowerCase());
      }).length;
  }, [templates, excludedStepIds, taskAssignments, memberRoleMap]);

  function handleToggleExclude(stepId: string): void {
    const current = excludedStepIds;
    const updated = current.includes(stepId)
      ? current.filter((id) => id !== stepId)
      : [...current, stepId];
    setValue('excludedStepIds', updated);
  }

  function handleAssignmentChange(stepId: string, userId: string): void {
    const current = taskAssignments.filter((a) => a.workflowStepId !== stepId);
    // Always store the entry — an empty assignedToUserId means
    // "explicitly unassigned" which suppresses auto role-match.
    const updated: TaskAssignment[] = [
      ...current,
      { workflowStepId: stepId, assignedToUserId: userId },
    ];
    setValue('taskAssignments', updated);
  }

  function handleMilestoneChange(stepId: string, order: number): void {
    const current = taskMilestoneOverrides.filter((o) => o.workflowStepId !== stepId);
    const updated: TaskMilestoneOverride[] =
      order === 0 ? current : [...current, { workflowStepId: stepId, milestoneOrder: order }];
    setValue('taskMilestoneOverrides', updated);
  }

  function handleDeleteMilestone(milestoneId: string): void {
    if (milestones.length <= 1) return;
    const updated = milestones.filter((m) => m.id !== milestoneId);
    setValue('milestones', updated);
  }

  function handleRenameMilestone(milestoneId: string, name: string): void {
    const updated = milestones.map((m) => (m.id === milestoneId ? { ...m, name } : m));
    setValue('milestones', updated);
  }

  function handleAddMilestone(): void {
    const maxOrder = Math.max(...milestones.map((m) => m.order), 0);
    const newMilestone: MilestoneGroup = {
      id: crypto.randomUUID(),
      name: `Milestone ${maxOrder + 1}`,
      type: MilestoneType.CUSTOM,
      order: maxOrder + 1,
    };
    setValue('milestones', [...milestones, newMilestone]);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <ChecklistIcon className="text-primary" fontSize="small" />
        </div>
        <div>
          <MUITypography variant="sectionTitle">Tasks &amp; Milestones</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary">
            Choose which tasks to include and assign them to team members.
          </MUITypography>
        </div>
      </div>

      {teamMembers.length === 0 && (
        <Alert severity="warning" className="mb-4">
          No team members added. Tasks cannot be manually assigned. Go back to Step 3 to add team
          members.
        </Alert>
      )}

      {unassignedCount > 0 && (
        <Alert severity="info" className="mb-4">
          {unassignedCount} task{unassignedCount > 1 ? 's' : ''} will be unassigned (no matching
          role in team).
        </Alert>
      )}

      {stepsLoading ? (
        <div className="p-8 text-center">
          <MUITypography variant="body" className="text-foreground-secondary">
            Loading workflow steps…
          </MUITypography>
        </div>
      ) : templates.length === 0 ? (
        <Alert severity="info" className="mb-4">
          No workflow steps configured. You can create the project without tasks and add them later.
        </Alert>
      ) : (
        <div className="flex flex-col gap-1">
          {milestones.map((milestone) => (
            <MilestoneTaskGroup
              key={milestone.id}
              milestone={milestone}
              tasks={milestoneToTasks.get(milestone.id) ?? []}
              excludedStepIds={excludedStepIds}
              taskAssignments={taskAssignments}
              taskMilestoneOverrides={taskMilestoneOverrides}
              milestoneOptions={milestoneOptions}
              teamMemberOptions={teamMemberOptions}
              memberRoleMap={memberRoleMap}
              userRoleLabelMap={userRoleLabelMap}
              canDelete={milestones.length > 1}
              onToggleExclude={handleToggleExclude}
              onAssignmentChange={handleAssignmentChange}
              onMilestoneChange={handleMilestoneChange}
              onDelete={handleDeleteMilestone}
              onRename={handleRenameMilestone}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <MuiButton
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddMilestone}
          color="inherit"
        >
          Add Milestone
        </MuiButton>
      </div>
    </div>
  );
}
