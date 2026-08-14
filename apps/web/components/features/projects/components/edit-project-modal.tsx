'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveIcon from '@mui/icons-material/Save';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { AvailableEmployeesList } from './project-create-wizard/components/available-employees-list';
import { SelectedTeamList } from './project-create-wizard/components/selected-team-list';
import { ProjectDetailsForm } from './project-details-form';
import { TaskReassignmentDialog, type ReassignableMember } from './task-reassignment-dialog';
import type { ProjectDetail, ProjectTeamMember } from '../hooks/types';
import {
  useEditProject,
  type AddTeamMemberPayload,
  type UpdateTeamMemberPayload,
} from '../hooks/use-edit-project';
import { projectEditSchema, type ProjectEditFormData } from '../schemas/project-edit.schema';
import { getDisplayRoles } from '../utils';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogDescription,
  MUITypography,
} from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import {
  useEmployees,
  useTeamWorkload,
  type EmployeeListItem,
  type TeamWorkloadItem,
} from '@/lib/hooks/resources';
import { useCan } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils/error';

// ── Types ──────────────────────────────────────────────────────

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  /** Current team members of this project (from backend). */
  currentTeam: ProjectTeamMember[];
  onSuccess: () => void;
}

/**
 * Staged removal: carries all info needed to execute removal on save.
 * taskReassignments maps taskId → new assignee userId.
 */
interface StagedRemoval {
  userId: string;
  /** Team membership record id (for DELETE /team/:memberId). */
  memberId: string;
  memberName: string;
  /** Tasks to be reassigned at save time. Empty means no tasks to reassign. */
  taskReassignments: Record<string, string>;
}

// ── Helpers ────────────────────────────────────────────────────

function buildDefaultValues(
  project: ProjectDetail,
  currentTeam: ProjectTeamMember[],
): ProjectEditFormData {
  const currentPmId = currentTeam.find((m) => m.isProjectManager)?.userId ?? '';
  return {
    name: project.name,
    description: project.description ?? '',
    priority: project.priority,
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
    teamMembers: currentTeam.map((m) => ({
      id: m.id,
      userId: m.userId,
      roleName: m.roleName,
      isProjectManager: m.isProjectManager,
    })),
    projectManagerId: currentPmId,
    originalStartDate: project.startDate ?? '',
  };
}

// ── Component ─────────────────────────────────────────────────

export function EditProjectModal({
  open,
  onOpenChange,
  project,
  currentTeam,
  onSuccess,
}: EditProjectModalProps): React.JSX.Element {
  const {
    updateProject,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    reassignTask,
    isUpdatingProject,
  } = useEditProject(project.id);

  // ── Employee data ──────────────────────────────────────────

  const { items: employees, isLoading: employeesLoading } = useEmployees({ status: 'active' });
  const { data: workloadData } = useTeamWorkload();
  const workloadMap = useMemo(() => {
    const map = new Map<string, TeamWorkloadItem>();
    workloadData?.forEach((w) => map.set(w.userId, w));
    return map;
  }, [workloadData]);

  const sortedEmployees = useMemo(
    (): EmployeeListItem[] =>
      (employees as EmployeeListItem[]).slice().sort((a, b) => {
        const aCount = workloadMap.get(a.userId)?.activeProjectCount ?? 0;
        const bCount = workloadMap.get(b.userId)?.activeProjectCount ?? 0;
        return aCount - bCount;
      }),
    [employees, workloadMap],
  );

  // ── Form ──────────────────────────────────────────────────

  const form = useForm<ProjectEditFormData>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: buildDefaultValues(project, currentTeam),
  });

  const {
    watch,
    setValue,
    formState: { isDirty, isSubmitting },
  } = form;
  const teamMembers = watch('teamMembers');
  const projectManagerId = watch('projectManagerId') ?? '';

  // Re-initialize the form every time the modal opens so it picks up the
  // latest project/team data (e.g. after a previous save that refetched).
  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(project, currentTeam));
      setStagedRemovals(new Map());
      setReassignDialog({ open: false, pending: null });
    }
  }, [open, project, currentTeam, form]);

  // ── Staged removals (in-memory until Save) ────────────────
  // keyed by userId
  const [stagedRemovals, setStagedRemovals] = useState<Map<string, StagedRemoval>>(new Map());
  const { can } = useCan();
  const canManageTeam = can('projects.team.manage');

  // Whether any original member has been staged for removal
  const hasStagedRemovals = stagedRemovals.size > 0;

  // ── Unsaved changes guard ────────────────────────────────

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const originalUserIds = useMemo(() => new Set(currentTeam.map((m) => m.userId)), [currentTeam]);
  const currentUserIds = useMemo(() => new Set(teamMembers.map((m) => m.userId)), [teamMembers]);
  const teamMembersChanged = useMemo(() => {
    if (hasStagedRemovals) return true;
    if (currentUserIds.size !== originalUserIds.size) return true;
    for (const id of currentUserIds) {
      if (!originalUserIds.has(id)) return true;
    }
    return false;
  }, [hasStagedRemovals, currentUserIds, originalUserIds]);

  function handleCloseAttempt(): void {
    if (isDirty || teamMembersChanged) {
      setConfirmDiscardOpen(true);
    } else {
      resetAndClose();
    }
  }

  function resetAndClose(): void {
    form.reset(buildDefaultValues(project, currentTeam));
    setStagedRemovals(new Map());
    setReassignDialog({ open: false, pending: null });
    setConfirmDiscardOpen(false);
    onOpenChange(false);
  }

  // ── Task reassignment dialog state ───────────────────────

  const [reassignDialog, setReassignDialog] = useState<{
    open: boolean;
    pending: { userId: string; memberId: string; memberName: string } | null;
  }>({ open: false, pending: null });

  // ── Derived eligible members for reassignment dialog ─────
  // Uses CURRENT form state members (minus the one being removed) so newly
  // added members show up, and already-staged-for-removal members don't.
  const eligibleReassignMembers = useMemo((): ReassignableMember[] => {
    if (!reassignDialog.pending) return [];
    const removingUserId = reassignDialog.pending.userId;
    return teamMembers
      .filter((m) => m.userId !== removingUserId)
      .map((m) => {
        const emp = sortedEmployees.find((e) => e.userId === m.userId);
        const displayName = emp
          ? [emp.user?.firstName, emp.user?.lastName].filter(Boolean).join(' ') ||
            emp.designation ||
            m.roleName
          : m.roleName;
        return { userId: m.userId, displayName };
      });
  }, [reassignDialog.pending, teamMembers, sortedEmployees]);

  // ── Selected user ids set (for AvailableEmployeesList) ───

  const selectedUserIds = useMemo(() => new Set(teamMembers.map((m) => m.userId)), [teamMembers]);

  // ── Team event handlers ──────────────────────────────────

  function handleAdd(emp: EmployeeListItem): void {
    if (selectedUserIds.has(emp.userId)) return;
    const displayRoles = getDisplayRoles(emp.roles);
    const autoRole =
      displayRoles.length > 0 ? displayRoles.join(', ') : (emp.designation ?? 'Team Member');
    const existingInOriginal = currentTeam.find((m) => m.userId === emp.userId);
    setValue(
      'teamMembers',
      [
        ...teamMembers,
        {
          id: existingInOriginal?.id,
          userId: emp.userId,
          roleName: autoRole,
          isProjectManager: false,
        },
      ],
      { shouldValidate: true, shouldDirty: true },
    );
    // If this member was previously staged for removal, un-stage them
    if (stagedRemovals.has(emp.userId)) {
      setStagedRemovals((prev) => {
        const next = new Map(prev);
        next.delete(emp.userId);
        return next;
      });
    }
  }

  function handleAttemptRemove(userId: string): void {
    const existingMember = currentTeam.find((m) => m.userId === userId);

    if (existingMember) {
      // Existing (persisted) member — open reassignment dialog to gather task assignments
      // (no API calls yet; all staged until Save)
      const memberUser = existingMember.user;
      const memberName =
        [memberUser?.firstName, memberUser?.lastName].filter(Boolean).join(' ') ||
        existingMember.roleName;
      setReassignDialog({
        open: true,
        pending: { userId, memberId: existingMember.id, memberName },
      });
    } else {
      // Newly added member (not yet persisted) — remove immediately from form only
      performLocalRemove(userId);
    }
  }

  function performLocalRemove(userId: string): void {
    setValue(
      'teamMembers',
      teamMembers.filter((m) => m.userId !== userId),
      { shouldValidate: true, shouldDirty: true },
    );
    if (projectManagerId === userId) {
      setValue('projectManagerId', '', { shouldDirty: true });
    }
  }

  function handleTogglePm(userId: string): void {
    const isPm = projectManagerId === userId;
    // Update the dedicated PM field — this is the source of truth for who is PM
    setValue('projectManagerId', isPm ? '' : userId, { shouldDirty: true });
    // Sync the isProjectManager flag on each team member for display purposes only.
    // Do NOT touch roleName — it belongs to the member, not the PM designation.
    setValue(
      'teamMembers',
      teamMembers.map((m) => ({
        ...m,
        isProjectManager: m.userId === userId ? !isPm : false,
      })),
      { shouldDirty: true },
    );
  }

  // ── Reassignment dialog confirm ──────────────────────────
  // This is purely in-memory — no API calls happen here.

  function handleReassignConfirm(assignments: Record<string, string>): void {
    if (!reassignDialog.pending) return;
    const { userId, memberId, memberName } = reassignDialog.pending;

    // Stage the removal with all collected task reassignments
    setStagedRemovals((prev) => {
      const next = new Map(prev);
      next.set(userId, { userId, memberId, memberName, taskReassignments: assignments });
      return next;
    });

    // Remove from the form's team list so they disappear from the UI immediately
    performLocalRemove(userId);
    setReassignDialog({ open: false, pending: null });
  }

  // ── Form submit — all API calls happen here ───────────────

  const handleSubmit = form.handleSubmit(async (data: ProjectEditFormData) => {
    try {
      const newPmId = data.projectManagerId ?? '';

      // 1. Update project details — only if any project-level field actually changed
      const projectFieldChanged =
        data.name.trim() !== project.name ||
        (data.description?.trim() ?? '') !== (project.description ?? '') ||
        data.priority !== project.priority ||
        (data.startDate || '') !== (project.startDate ?? '') ||
        (data.endDate || '') !== (project.endDate ?? '');

      if (projectFieldChanged) {
        await updateProject({
          name: data.name.trim(),
          description: data.description?.trim() ?? '',
          priority: data.priority,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
        });
      }

      // 2. Update existing members whose PM status changed.
      //    Compare against currentTeam (the server snapshot from when modal opened).
      const pmUpdates: UpdateTeamMemberPayload[] = currentTeam
        .filter((original) => {
          if (stagedRemovals.has(original.userId)) return false;
          const stillInForm = data.teamMembers.some((m) => m.userId === original.userId);
          if (!stillInForm) return false;
          const newIsPm = newPmId === original.userId;
          return newIsPm !== original.isProjectManager;
        })
        .map((original) => ({
          memberId: original.id,
          isProjectManager: newPmId === original.userId,
        }));

      for (const payload of pmUpdates) {
        await updateTeamMember(payload);
      }

      // 3. Execute staged removals: reassign tasks first, then remove members
      for (const staged of stagedRemovals.values()) {
        for (const [taskId, assignedToUserId] of Object.entries(staged.taskReassignments)) {
          await reassignTask({ taskId, assignedToUserId });
        }
        await removeTeamMember({ memberId: staged.memberId });
      }

      // 4. Add new members (not in original team and not staged for removal)
      const additions = data.teamMembers.filter(
        (m) => !originalUserIds.has(m.userId) && !stagedRemovals.has(m.userId),
      );
      const addPayloads: AddTeamMemberPayload[] = additions.map((m) => ({
        userId: m.userId,
        roleName: m.roleName.trim(),
        isProjectManager: newPmId === m.userId,
      }));
      for (const payload of addPayloads) {
        await addTeamMember(payload);
      }

      showToast.success('Project updated successfully');
      setStagedRemovals(new Map());
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  });

  const isBusy = isSubmitting || isUpdatingProject;

  return (
    <>
      <MUIDialog
        open={open}
        onOpenChange={handleCloseAttempt}
        size="xl"
        disableEscapeKeyDown={isBusy}
      >
        <MUIDialogHeader>
          <MUIDialogTitle>Edit Project</MUIDialogTitle>
          <MUIDialogDescription>
            Update project details and manage team members.
          </MUIDialogDescription>
        </MUIDialogHeader>

        <MUIDialogBody sx={{ p: 0 }}>
          <div className="flex flex-col">
            {/* Project Details Section */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <InfoOutlinedIcon fontSize="small" className="text-foreground-secondary" />
                <MUITypography variant="sectionTitle">Project Details</MUITypography>
              </div>
              <ProjectDetailsForm form={form} disabled={isBusy} />
            </div>

            <Divider />

            {/* Team Management Section */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <GroupsIcon fontSize="small" className="text-foreground-secondary" />
                <MUITypography variant="sectionTitle">Team Management</MUITypography>
              </div>

              {/* Whole section gated, not each add/remove control: the two
                  lists are a single editing surface, and half of it being
                  live would be more confusing than none of it. */}
              {!canManageTeam ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You can see this project&rsquo;s team but not change it. Ask a superadmin for the
                  <strong> projects.team.manage </strong> permission.
                </Alert>
              ) : null}

              {hasStagedRemovals && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {stagedRemovals.size} member{stagedRemovals.size !== 1 ? 's' : ''} staged for
                  removal. Changes will be applied when you click &ldquo;Save Changes&rdquo;.
                </Alert>
              )}

              {employeesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <CircularProgress size={28} />
                </div>
              ) : (
                <div className="flex rounded-lg overflow-hidden shadow-e1" style={{ height: 460 }}>
                  {/* Left — selected team */}
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
                        employees={sortedEmployees}
                        workloadMap={workloadMap}
                        onRemove={handleAttemptRemove}
                        onTogglePm={handleTogglePm}
                        disableRemove={() => isBusy || !canManageTeam}
                        disableRemoveTooltip={
                          canManageTeam
                            ? 'Cannot remove members while saving'
                            : 'You do not have permission to change the team'
                        }
                      />
                    </div>
                  </div>

                  {/* Right — all employees */}
                  <div className="flex flex-col w-1/2 min-h-0">
                    <div className="flex-shrink-0 px-4 py-3 bg-background-secondary">
                      <MUITypography variant="sectionTitle">All Employees</MUITypography>
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0">
                      <AvailableEmployeesList
                        employees={sortedEmployees}
                        selectedUserIds={selectedUserIds}
                        workloadMap={workloadMap}
                        onAdd={handleAdd}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </MUIDialogBody>

        <MUIDialogFooter>
          <Button variant="outlined" onClick={handleCloseAttempt} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={isBusy}
            startIcon={
              isBusy ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon fontSize="small" />
              )
            }
          >
            {isBusy ? 'Saving…' : 'Save Changes'}
          </Button>
        </MUIDialogFooter>
      </MUIDialog>

      {/* Discard changes confirmation */}
      <Dialog
        open={confirmDiscardOpen}
        onClose={() => setConfirmDiscardOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Discard Changes?</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You have unsaved changes. Are you sure you want to discard them?
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirmDiscardOpen(false)}>
            Keep Editing
          </Button>
          <Button variant="contained" color="error" onClick={resetAndClose}>
            Discard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task reassignment dialog — purely in-memory staging, no API calls */}
      {reassignDialog.pending && (
        <TaskReassignmentDialog
          open={reassignDialog.open}
          onOpenChange={(isOpen) => {
            if (!isOpen) setReassignDialog({ open: false, pending: null });
          }}
          projectId={project.id}
          memberUserId={reassignDialog.pending.userId}
          memberName={reassignDialog.pending.memberName}
          eligibleMembers={eligibleReassignMembers}
          onConfirm={handleReassignConfirm}
        />
      )}
    </>
  );
}
