'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import { TaskPriority, TaskStatus, type TaskStatusConfig } from '@oneohm-epc/shared/types';
import { type JSX, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { useProjectTeam, type ProjectDetail, type ProjectTeamMember } from '../../../hooks';
import { useCreateProjectTask } from '../../../hooks/use-create-project-task';
import {
  createProjectTaskSchema,
  type CreateProjectTaskFormData,
} from '../../../schemas/create-project-task.schema';

import {
  type AssigneeOption,
  MUIDatePicker,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
  MUIUserAssigneeSelector,
} from '@/components/ui';
import { PriorityDropdown } from '@/components/ui/priority-dropdown';
import { useModalForm } from '@/lib/hooks/core';
import { getErrorMessage } from '@/lib/utils';

interface CreateProjectTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  project: ProjectDetail;
  taskStatuses: TaskStatusConfig[];
  /** If provided, the modal pre-selects this status when opening (e.g. from a board column footer). */
  preselectedStatus?: string | null;
}

function formatLocalDate(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(isoDate: string | undefined): Date | undefined {
  if (!isoDate) return undefined;
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function getMemberDisplayName(member: ProjectTeamMember): string {
  if (member.user) {
    const name = `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim();
    return name || member.user.email || member.userId;
  }
  return member.userId;
}

export function CreateProjectTaskModal({
  open,
  onOpenChange,
  projectId,
  project,
  taskStatuses,
  preselectedStatus,
}: CreateProjectTaskModalProps): JSX.Element {
  const createTaskMutation = useCreateProjectTask(projectId);
  const { data: teamMembers = [], isLoading: teamLoading } = useProjectTeam(projectId, {
    enabled: open,
  });

  const statusOptions = useMemo<Array<{ value: TaskStatus; label: string }>>(
    () =>
      [...taskStatuses]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((status) => ({ value: status.code, label: status.label })),
    [taskStatuses],
  );
  const defaultStatus = statusOptions[0]?.value ?? TaskStatus.BACKLOG;

  const assigneeOptions = useMemo<AssigneeOption[]>(
    () =>
      teamMembers.map((member) => ({
        id: member.userId,
        displayName: getMemberDisplayName(member),
        secondaryText: member.roleName,
      })),
    [teamMembers],
  );

  const milestoneOptions = useMemo(
    () => project.milestones.map((milestone) => ({ value: milestone.id, label: milestone.name })),
    [project.milestones],
  );

  const form = useForm<CreateProjectTaskFormData>({
    resolver: zodResolver(createProjectTaskSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      status: defaultStatus,
      priority: TaskPriority.MEDIUM,
      assignedToUserId: null,
      milestoneId: '',
      startDate: '',
      endDate: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    // If a preselected status is provided and valid, apply it first.
    if (preselectedStatus) {
      const isValid = statusOptions.some((s) => (s.value as string) === preselectedStatus);
      if (isValid) {
        form.setValue('status', preselectedStatus as TaskStatus, { shouldValidate: true });
        return;
      }
    }
    const currentStatus = form.getValues('status');
    const hasConfiguredStatus = statusOptions.some((status) => status.value === currentStatus);
    if (!hasConfiguredStatus) {
      form.setValue('status', defaultStatus, { shouldValidate: true });
    }
  }, [open, form, statusOptions, defaultStatus, preselectedStatus]);

  const { handleSubmit, handleClose, isSubmitting } = useModalForm({
    form,
    mutation: createTaskMutation,
    onOpenChange,
    transformPayload: (data) => ({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      status: data.status,
      priority: data.priority,
      assignedToUserId: data.assignedToUserId === null ? null : data.assignedToUserId || undefined,
      milestoneId: data.milestoneId || undefined,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    }),
  });

  const startDateValue = form.watch('startDate');

  return (
    <MUIDialog open={open} onOpenChange={handleClose}>
      <MUIDialogHeader>
        <MUIDialogTitle>Add Task</MUIDialogTitle>
        <MUIDialogDescription>
          Create a project-specific task and assign it to a team member.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(createTaskMutation.error) && (
            <Alert severity="error">{getErrorMessage(createTaskMutation.error)}</Alert>
          )}

          <MUIInput
            id="project-task-name"
            fieldLabel="Task Name"
            required
            placeholder="Enter task name"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <MUIInput
            id="project-task-description"
            fieldLabel="Description"
            placeholder="Optional description"
            multiline
            minRows={3}
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <MUISelect
                  fieldLabel="Status"
                  required
                  value={field.value}
                  onChange={(event: SelectChangeEvent<unknown>) =>
                    field.onChange(event.target.value as TaskStatus)
                  }
                  options={statusOptions}
                  error={form.formState.errors.status?.message}
                  placeholder="Select status"
                />
              )}
            />

            <Controller
              name="priority"
              control={form.control}
              render={({ field }) => (
                <PriorityDropdown
                  fieldLabel="Priority"
                  required
                  value={field.value}
                  onChange={(event: SelectChangeEvent<unknown>) =>
                    field.onChange(event.target.value as TaskPriority)
                  }
                  error={form.formState.errors.priority?.message}
                />
              )}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Controller
              name="assignedToUserId"
              control={form.control}
              render={({ field }) => (
                <MUIUserAssigneeSelector
                  fieldLabel="Assignee"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={assigneeOptions}
                  optionsLoading={teamLoading}
                  allowUnassign
                  disablePortal
                  placeholder="Unassigned"
                  emptyText="No team members"
                  triggerMinWidth={0}
                  error={form.formState.errors.assignedToUserId?.message}
                />
              )}
            />

            <Controller
              name="milestoneId"
              control={form.control}
              render={({ field }) => (
                <MUISelect
                  fieldLabel="Milestone"
                  value={field.value ?? ''}
                  onChange={(event: SelectChangeEvent<unknown>) =>
                    field.onChange(event.target.value)
                  }
                  options={milestoneOptions}
                  placeholder="Select milestone (optional)"
                  error={form.formState.errors.milestoneId?.message}
                />
              )}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Controller
              name="startDate"
              control={form.control}
              render={({ field }) => (
                <MUIDatePicker
                  fieldLabel="Start Date"
                  value={field.value || null}
                  onChange={(date) => field.onChange(formatLocalDate(date))}
                  error={form.formState.errors.startDate?.message}
                />
              )}
            />

            <Controller
              name="endDate"
              control={form.control}
              render={({ field }) => (
                <MUIDatePicker
                  fieldLabel="Due Date"
                  value={field.value || null}
                  minDate={parseLocalDate(startDateValue)}
                  onChange={(date) => field.onChange(formatLocalDate(date))}
                  error={form.formState.errors.endDate?.message}
                />
              )}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Task code is generated automatically by the backend.
          </Typography>
        </MUIDialogBody>

        <MUIDialogFooter>
          <Button
            variant="outlined"
            onClick={() => {
              handleClose(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !form.formState.isValid}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                Creating...
              </Box>
            ) : (
              'Create Task'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
