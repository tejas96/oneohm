'use client';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { MenuItem, Box, Divider, Link as MuiLink, Skeleton } from '@mui/material';
import {
  type TaskPriority,
  type TaskStatus,
  type TaskStatusConfig,
} from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useMemo, useCallback } from 'react';

import { TASK_STATUS_LABELS } from '../../projects/constants';
import { useProjectTeam, type ProjectTeamMember } from '../../projects/hooks';

import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUISelect } from '@/components/ui/mui-select';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  MUIUserAssigneeSelector,
  type AssigneeOption,
} from '@/components/ui/mui-user-assignee-selector';
import { PriorityDropdown } from '@/components/ui/priority-dropdown';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { MUI_LABEL_FONT_SIZE } from '@/lib/theme/mui-theme';
import { formatDate } from '@/lib/utils';

interface TaskDrawerMetadataProps {
  projectId: string;
  projectNumber: string;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  taskStatuses: TaskStatusConfig[];
  statusesLoading?: boolean;
  hasDependencyBlockers?: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onAssigneeChange: (userId: string | null) => void;
  onDueDateChange: (date: string | undefined) => void;
}

function getMemberDisplayName(member: ProjectTeamMember): string {
  if (member.user) {
    const name = `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim();
    return name || member.user.email || member.userId;
  }
  return member.userId;
}

export function TaskDrawerMetadata({
  projectId,
  projectNumber,
  projectName,
  status,
  priority,
  assignedToUserId,
  endDate,
  createdAt,
  updatedAt,
  taskStatuses,
  statusesLoading = false,
  hasDependencyBlockers = false,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
}: TaskDrawerMetadataProps): React.JSX.Element {
  // No fallback — statuses come from the project's configured lookup data
  const allStatuses = taskStatuses;
  const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });

  // Label for the current status — falls back to TASK_STATUS_LABELS for out-of-config statuses
  const currentStatusLabel = useMemo(() => {
    const found = allStatuses.find((s) => s.code === status);
    return found?.label ?? TASK_STATUS_LABELS[status];
  }, [allStatuses, status]);

  const { data: teamMembers = [], isLoading: teamLoading } = useProjectTeam(projectId);

  // Map ProjectTeamMember[] → AssigneeOption[] for the generic selector
  const assigneeOptions = useMemo<AssigneeOption[]>(
    () =>
      teamMembers.map((m) => ({
        id: m.userId,
        displayName: getMemberDisplayName(m),
        secondaryText: m.roleName,
      })),
    [teamMembers],
  );

  const handleDateChange = useCallback(
    (date: Date | null): void => {
      if (!date) {
        onDueDateChange(undefined);
        return;
      }
      onDueDateChange(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      );
    },
    [onDueDateChange],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Status */}
      <Box>
        <MUITypography variant="metaLabel" sx={{ mb: 0.75 }}>
          Status
        </MUITypography>
        {statusesLoading ? (
          <Skeleton variant="rounded" height={31} />
        ) : (
          <MUISelect
            value={status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            formControlProps={{ fullWidth: true, size: 'small', sx: { margin: 0 } }}
            MenuProps={{ disablePortal: true }}
            disabled={hasDependencyBlockers}
          >
            <MenuItem value={status} disabled>
              {currentStatusLabel} (current)
            </MenuItem>
            {allStatuses
              .filter((s) => s.code !== status)
              .map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.label}
                </MenuItem>
              ))}
          </MUISelect>
        )}
        {hasDependencyBlockers && !statusesLoading && (
          <MUITypography
            variant="body"
            sx={{
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'warning.main',
              fontSize: 11,
            }}
          >
            Complete all dependencies before changing status.
          </MUITypography>
        )}
      </Box>

      {/* Priority */}
      <Box>
        <MUITypography variant="metaLabel" sx={{ mb: 0.75 }}>
          Priority
        </MUITypography>
        <PriorityDropdown
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
          formControlProps={{ fullWidth: true, size: 'small', sx: { margin: 0 } }}
          MenuProps={{ disablePortal: true }}
        />
      </Box>

      {/* Assignee */}
      <Box>
        <MUITypography variant="metaLabel" sx={{ mb: 0.75 }}>
          Assignee
        </MUITypography>
        <MUIUserAssigneeSelector
          value={assignedToUserId ?? null}
          onChange={onAssigneeChange}
          options={assigneeOptions}
          optionsLoading={teamLoading}
          emptyText="No team members"
          allowUnassign
          disablePortal
          placeholder="Unassigned"
          triggerMinWidth={0}
          searchPlaceholder="Search team members…"
        />
      </Box>

      {/* Due Date */}
      <Box>
        <MUITypography variant="metaLabel" sx={{ mb: 0.75 }}>
          Due Date
        </MUITypography>
        <MUIDatePicker
          value={endDate ?? null}
          onChange={handleDateChange}
          placeholder="Set due date"
          fullWidth
          minDate={new Date()}
          slotProps={{
            popper: {
              disablePortal: true,
              placement: 'bottom-start',
              sx: { zIndex: 1500 },
            },
          }}
        />
        <MUITypography variant="body" sx={{ mt: 0.75, color: 'text.secondary', fontSize: 11 }}>
          Initial due date is auto-set from workflow step effort days. You can edit it anytime.
        </MUITypography>
      </Box>

      <Divider />

      {/* Project */}
      <Box>
        <MUITypography variant="metaLabel" sx={{ mb: 0.75 }}>
          Project
        </MUITypography>
        <MuiLink
          component={NextLink}
          href={projectHref}
          sx={{
            fontSize: MUI_LABEL_FONT_SIZE,
            color: 'primary.main',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {projectNumber} - {projectName}
        </MuiLink>
      </Box>

      {/* Timestamps */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <MUITypography variant="timestamp">Created {formatDate(createdAt)}</MUITypography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <MUITypography variant="timestamp">Updated {formatDate(updatedAt)}</MUITypography>
        </Box>
      </Box>
    </Box>
  );
}
