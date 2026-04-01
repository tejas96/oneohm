'use client';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { MenuItem, Box, Divider, Link as MuiLink } from '@mui/material';
import {
  TASK_STATUS_TRANSITIONS,
  type TaskPriority,
  type TaskStatus,
} from '@oneohm-epc/shared/types';
import NextLink from 'next/link';
import { useMemo, useCallback } from 'react';

import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../projects/constants';
import { useProjectTeam, type ProjectTeamMember } from '../../projects/hooks';

import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUISelect } from '@/components/ui/mui-select';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  MUIUserAssigneeSelector,
  type AssigneeOption,
} from '@/components/ui/mui-user-assignee-selector';
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
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
}: TaskDrawerMetadataProps): React.JSX.Element {
  const allowedStatuses = useMemo(() => TASK_STATUS_TRANSITIONS[status], [status]);
  const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });

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
        <MUISelect
          value={status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          formControlProps={{ fullWidth: true, size: 'small', sx: { margin: 0 } }}
          MenuProps={{ disablePortal: true }}
        >
          <MenuItem value={status} disabled>
            {TASK_STATUS_LABELS[status]} (current)
          </MenuItem>
          {allowedStatuses.map((s) => (
            <MenuItem key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </MenuItem>
          ))}
        </MUISelect>
      </Box>

      {/* Priority */}
      <Box>
        <MUITypography variant="metaLabel" sx={{ mb: 0.75 }}>
          Priority
        </MUITypography>
        <MUISelect
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
          formControlProps={{ fullWidth: true, size: 'small', sx: { margin: 0 } }}
          MenuProps={{ disablePortal: true }}
        >
          {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
            <MenuItem key={p} value={p}>
              {TASK_PRIORITY_LABELS[p]}
            </MenuItem>
          ))}
        </MUISelect>
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
