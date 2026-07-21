'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useState, useMemo, useCallback } from 'react';

import { useProjectMemberTasks } from '../hooks/use-edit-project';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogDescription,
  MUITypography,
} from '@/components/ui';

// ── Types ──────────────────────────────────────────────────────

export interface ReassignableMember {
  userId: string;
  displayName: string;
}

interface TaskReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** userId of the member being removed — excluded from the assignee list. */
  memberUserId: string;
  memberName: string;
  /**
   * All currently selected team members from form state (excluding the one being removed).
   * These are the eligible reassignment targets.
   */
  eligibleMembers: ReassignableMember[];
  /**
   * Called with the staged task→assignee map when the user confirms.
   * Does NOT call any APIs — the parent commits changes on final save.
   */
  onConfirm: (reassignments: Record<string, string>) => void;
}

// ── Component ─────────────────────────────────────────────────

export function TaskReassignmentDialog({
  open,
  onOpenChange,
  projectId,
  memberUserId,
  memberName,
  eligibleMembers,
  onConfirm,
}: TaskReassignmentDialogProps): React.JSX.Element {
  const {
    data: tasks,
    isLoading,
    isError,
  } = useProjectMemberTasks(projectId, memberUserId, {
    enabled: open,
  });

  // Map: taskId -> newAssigneeUserId
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');

  const activeTasks = useMemo(() => tasks ?? [], [tasks]);

  const allAssigned = useMemo(
    () => activeTasks.length > 0 && activeTasks.every((t) => !!assignments[t.id]),
    [activeTasks, assignments],
  );

  function handleAssign(taskId: string, userId: string): void {
    setAssignments((prev) => ({ ...prev, [taskId]: userId }));
  }

  const handleBulkAssign = useCallback(
    (userId: string) => {
      setBulkAssigneeId(userId);
      const bulk: Record<string, string> = {};
      activeTasks.forEach((t) => {
        bulk[t.id] = userId;
      });
      setAssignments(bulk);
    },
    [activeTasks],
  );

  function handleConfirm(): void {
    onConfirm(assignments);
    // Reset dialog state for next open
    setAssignments({});
    setBulkAssigneeId('');
  }

  function handleClose(): void {
    setAssignments({});
    setBulkAssigneeId('');
    onOpenChange(false);
  }

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Reassign Tasks Before Removal</MUIDialogTitle>
        <MUIDialogDescription>
          {memberName} has {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} in this
          project. Reassign all tasks before removing them from the team.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <CircularProgress size={28} />
          </div>
        )}

        {isError && (
          <Alert severity="error">
            Failed to load tasks for this member. Please close and try again.
          </Alert>
        )}

        {!isLoading && !isError && activeTasks.length === 0 && (
          <Alert severity="success">
            No active tasks found for {memberName}. You can safely remove them.
          </Alert>
        )}

        {!isLoading && !isError && activeTasks.length > 0 && (
          <div className="flex flex-col gap-4">
            <Alert severity="warning">
              All {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} must be reassigned
              before {memberName} can be removed.
            </Alert>

            {/* Bulk assign row */}
            {eligibleMembers.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary">
                <MUITypography variant="bodyPrimary" className="shrink-0">
                  Reassign all to:
                </MUITypography>
                <Select
                  value={bulkAssigneeId}
                  onChange={(e) => handleBulkAssign(e.target.value)}
                  size="small"
                  displayEmpty
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="" disabled>
                    Select a team member
                  </MenuItem>
                  {eligibleMembers.map((m) => (
                    <MenuItem key={m.userId} value={m.userId}>
                      {m.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </div>
            )}

            {eligibleMembers.length === 0 && (
              <Alert severity="info">
                No other team members are available. Add a team member first before removing{' '}
                {memberName}.
              </Alert>
            )}

            {/* Per-task rows */}
            <div className="flex flex-col gap-2">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg shadow-e1"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Chip
                      label={task.status}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, height: 20 }}
                    />
                    <MUITypography
                      variant="body"
                      className="truncate text-foreground"
                      title={task.name}
                    >
                      {task.name}
                    </MUITypography>
                  </div>
                  <Select
                    value={assignments[task.id] ?? ''}
                    onChange={(e) => handleAssign(task.id, e.target.value)}
                    size="small"
                    displayEmpty
                    disabled={eligibleMembers.length === 0}
                    error={!assignments[task.id]}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="" disabled>
                      Choose assignee
                    </MenuItem>
                    {eligibleMembers.map((m) => (
                      <MenuItem key={m.userId} value={m.userId}>
                        {m.displayName}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={
            isLoading ||
            isError ||
            (activeTasks.length > 0 && (!allAssigned || eligibleMembers.length === 0))
          }
        >
          {activeTasks.length === 0 ? 'Remove Member' : 'Confirm & Stage Removal'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
