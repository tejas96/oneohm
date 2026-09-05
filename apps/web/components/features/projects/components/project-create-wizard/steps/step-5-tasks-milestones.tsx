'use client';

import AddIcon from '@mui/icons-material/Add';
import ChecklistIcon from '@mui/icons-material/Checklist';
import Alert from '@mui/material/Alert';
import MuiButton from '@mui/material/Button';
import { isProjectBaselineStep } from '@tejas96/shared/utils';
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
import { useAllActiveWorkflowSteps, useEmployees, type WorkflowStep } from '@/lib/hooks/resources';

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

  const { items: rawTemplates, isLoading: stepsLoading } = useAllActiveWorkflowSteps();
  // Same rule the backend applies when it builds the tasks. Without it the wizard
  // lists the change-request templates and promises tasks the project never gets.
  const templates: WorkflowStep[] = useMemo(
    () => (rawTemplates as WorkflowStep[]).filter(isProjectBaselineStep),
    [rawTemplates],
  );
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

  // Group tasks by milestone based on overrides or default milestone name
  const milestoneToTasks = useMemo(() => {
    const map = new Map<string, typeof templates>();
    milestones.forEach((m) => map.set(m.name, []));

    for (const step of templates) {
      const override = taskMilestoneOverrides.find((o) => o.workflowStepId === step.id);
      if (override?.milestoneName) {
        const bucket = map.get(override.milestoneName);
        if (bucket) {
          bucket.push(step);
          continue;
        }
      }
      // Default: match by defaultMilestoneName from workflow step
      const defaultName = (step as { defaultMilestoneName?: string | null }).defaultMilestoneName;
      const milestone =
        (defaultName ? milestones.find((m) => m.name === defaultName) : null) ?? milestones[0];
      if (milestone) map.get(milestone.name)?.push(step);
    }
    return map;
  }, [templates, milestones, taskMilestoneOverrides]);

  const milestoneOptions = milestones.map((m) => ({
    value: m.name,
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

  function handleMilestoneChange(
    stepId: string,
    milestoneName: string | null,
    milestoneOrder: number | null,
  ): void {
    const current = taskMilestoneOverrides.filter((o) => o.workflowStepId !== stepId);
    // null or empty string both mean "No Milestone" — store a null override so the grouping
    // logic correctly falls back to the default milestone for this step.
    const resolvedName = milestoneName || null;
    const updated: TaskMilestoneOverride[] =
      resolvedName == null
        ? current
        : [...current, { workflowStepId: stepId, milestoneName: resolvedName, milestoneOrder }];
    setValue('taskMilestoneOverrides', updated);
  }

  function handleDeleteMilestone(milestoneName: string): void {
    if (milestones.length <= 1) return;
    const updated = milestones.filter((m) => m.name !== milestoneName);
    setValue('milestones', updated);
    // Clear overrides that pointed to the deleted milestone so tasks fall back to defaults
    const cleanedOverrides = taskMilestoneOverrides.filter(
      (o) => o.milestoneName !== milestoneName,
    );
    setValue('taskMilestoneOverrides', cleanedOverrides);
  }

  function handleRenameMilestone(oldName: string, newName: string): void {
    const renamedMilestone = milestones.find((m) => m.name === oldName);
    if (!renamedMilestone) return;

    const updatedMilestones = milestones.map((m) =>
      m.name === oldName ? { ...m, name: newName } : m,
    );

    // 1. Update existing explicit overrides that pointed to the old name
    const baseOverrides = taskMilestoneOverrides.map((o) =>
      o.milestoneName === oldName ? { ...o, milestoneName: newName } : o,
    );

    // 2. Tasks that were in the renamed group via DEFAULT (no override) would lose their
    //    membership because step.defaultMilestoneName still points to the old name.
    //    Write explicit overrides for them now so they stay in the renamed group.
    const overridesMap = new Map(baseOverrides.map((o) => [o.workflowStepId, o]));
    for (const step of templates) {
      if (overridesMap.has(step.id)) continue; // already has an explicit override
      const defaultName = (step as { defaultMilestoneName?: string | null }).defaultMilestoneName;
      // This task was in the old group either by exact default-name match or by first-milestone fallback
      const wasInGroup =
        defaultName === oldName ||
        // first-milestone fallback: no default name match in old milestones list
        (!milestones.some((m) => m.name === defaultName) && milestones[0]?.name === oldName);
      if (wasInGroup) {
        overridesMap.set(step.id, {
          workflowStepId: step.id,
          milestoneName: newName,
          milestoneOrder: renamedMilestone.order,
        });
      }
    }

    setValue('milestones', updatedMilestones);
    setValue('taskMilestoneOverrides', [...overridesMap.values()]);
  }

  function handleAddMilestone(): void {
    const maxOrder = Math.max(...milestones.map((m) => m.order), 0);
    const newMilestone: MilestoneGroup = {
      name: `Milestone ${maxOrder + 1}`,
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
              key={milestone.order}
              milestone={milestone}
              tasks={milestoneToTasks.get(milestone.name) ?? []}
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
