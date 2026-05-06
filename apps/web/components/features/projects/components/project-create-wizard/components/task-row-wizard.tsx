'use client';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Tooltip from '@mui/material/Tooltip';

import {
  Checkbox,
  MUISelect,
  MUIStatusChip,
  MUITypography,
  MUIUserAssigneeSelector,
  type AssigneeOption,
} from '@/components/ui';
import type { WorkflowStep } from '@/lib/hooks/resources';

// ── Types ──────────────────────────────────────────────────────

export interface TaskAssignment {
  workflowStepId: string;
  assignedToUserId: string;
}

export interface TaskMilestoneOverride {
  workflowStepId: string;
  milestoneName: string | null;
  milestoneOrder: number | null;
}

export interface MilestoneOption {
  value: string;
  label: string;
  order: number;
}

export interface TeamMemberOption {
  value: string;
  label: string;
}

interface TaskRowWizardProps {
  step: WorkflowStep;
  isExcluded: boolean;
  assignment?: TaskAssignment;
  milestoneOverride?: TaskMilestoneOverride;
  /** The milestone group this task currently belongs to (derived by the parent). Used as the
   *  authoritative display value so renames never cause the dropdown to jump to a different group. */
  currentGroupMilestoneName: string;
  milestoneOptions: MilestoneOption[];
  teamMemberOptions: TeamMemberOption[];
  memberRoleMap: Map<string, string>;
  userRoleLabelMap: Map<string, string>;
  onToggleExclude: (stepId: string) => void;
  onAssignmentChange: (stepId: string, userId: string) => void;
  onMilestoneChange: (
    stepId: string,
    milestoneName: string | null,
    milestoneOrder: number | null,
  ) => void;
}

// ── Component ─────────────────────────────────────────────────

export function TaskRowWizard({
  step,
  isExcluded,
  assignment,
  milestoneOverride,
  currentGroupMilestoneName,
  milestoneOptions,
  teamMemberOptions,
  memberRoleMap,
  userRoleLabelMap,
  onToggleExclude,
  onAssignmentChange,
  onMilestoneChange,
}: TaskRowWizardProps): React.JSX.Element {
  const isMandatory = step.isMandatory ?? false;
  const hasRoleMatch =
    !step.defaultRoleCode || memberRoleMap.has(step.defaultRoleCode.toLowerCase());

  // The displayed value in the milestone select is determined by:
  // 1. An explicit override (user manually moved this task) — use the override name
  // 2. Otherwise use currentGroupMilestoneName (the group this task is actually in, as computed
  //    by the parent). This ensures renames never cause the dropdown to jump to another milestone.
  // Null/empty override means "No Milestone" was explicitly selected.
  const currentMilestoneName: string = (() => {
    if (milestoneOverride !== undefined) {
      return milestoneOverride.milestoneName ?? '';
    }
    return currentGroupMilestoneName;
  })();
  const currentAssigneeId = assignment?.assignedToUserId ?? '';

  // The userId auto-matched by role — shown when no manual assignment exists
  const autoAssignedUserId =
    !assignment && step.defaultRoleCode
      ? (memberRoleMap.get(step.defaultRoleCode.toLowerCase()) ?? null)
      : null;

  const displayedAssigneeId = currentAssigneeId || autoAssignedUserId;

  const milestoneSelectOptions = [
    { value: '', label: 'No Milestone' },
    ...milestoneOptions.map((m) => ({ value: m.value, label: m.label })),
  ];

  const assigneeOptions: AssigneeOption[] = teamMemberOptions.map((m) => ({
    id: m.value,
    displayName: m.label,
    secondaryText: userRoleLabelMap.get(m.value) ?? undefined,
  }));

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg ${isExcluded ? 'opacity-50' : ''}`}
    >
      <Checkbox
        checked={!isExcluded}
        disabled={isMandatory}
        onCheckedChange={() => onToggleExclude(step.id)}
        aria-label={`Include task: ${step.name}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <MUITypography variant="bodyPrimary" noWrap>
            {step.name}
          </MUITypography>
          {isMandatory && <MUIStatusChip label="Required" color="info" size="small" />}
          {!hasRoleMatch && !isExcluded && (
            <Tooltip title={`No team member with role "${step.defaultRoleCode ?? ''}"`}>
              <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
            </Tooltip>
          )}
        </div>
        <MUITypography variant="finePrint" className="text-foreground-secondary">
          {step.defaultRoleCode ? `Role: ${step.defaultRoleCode}` : 'No default role'}
          {step.effortDays ? ` · ${step.effortDays}d` : ''}
        </MUITypography>
      </div>

      {!isExcluded && (
        <>
          <div className="w-36">
            <MUISelect
              value={currentMilestoneName}
              onChange={(e) => {
                const selected = milestoneOptions.find((m) => m.value === e.target.value);
                onMilestoneChange(step.id, selected?.value ?? null, selected?.order ?? null);
              }}
              options={milestoneSelectOptions}
              size="small"
              fullWidth
            />
          </div>

          <div className="w-44">
            <MUIUserAssigneeSelector
              value={displayedAssigneeId}
              onChange={(userId) => onAssignmentChange(step.id, userId ?? '')}
              options={assigneeOptions}
              allowUnassign={!!displayedAssigneeId}
              placeholder="Unassigned"
              triggerMinWidth={176}
              searchPlaceholder="Search team members…"
              emptyText="No team members added yet."
              disablePortal
            />
          </div>

          <MUIStatusChip
            label={currentAssigneeId ? 'Manual' : autoAssignedUserId ? 'Auto' : '—'}
            color={currentAssigneeId ? 'success' : autoAssignedUserId ? 'default' : 'default'}
            size="small"
          />
        </>
      )}
    </div>
  );
}
