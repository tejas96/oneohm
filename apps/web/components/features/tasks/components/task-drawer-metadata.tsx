'use client';

import { MenuItem, Box, Link as MuiLink, Typography } from '@mui/material';
import { type TaskStatusOption } from '@tejas96/shared/constants';
import { type TaskPriority, type TaskStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useMemo, useCallback } from 'react';

import { TASK_STATUS_LABELS } from '../../projects/constants';
import { useProjectTeam, type ProjectTeamMember } from '../../projects/hooks';

import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUISelect } from '@/components/ui/mui-select';
import {
  MUIUserAssigneeSelector,
  type AssigneeOption,
} from '@/components/ui/mui-user-assignee-selector';
import { PriorityDropdown } from '@/components/ui/priority-dropdown';
import { buildRoute, ROUTES } from '@/lib/config/routes';
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
  taskStatuses: TaskStatusOption[];
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

/** Signature overline micro-label — 11px / 700 / 0.12em, sentence content in caps. */
function FieldLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Typography
      component="div"
      sx={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        lineHeight: 1,
        color: 'var(--ds-text-tertiary)',
        mb: 0.875,
      }}
    >
      {children}
    </Typography>
  );
}

/** Helper copy under a field. */
function FieldHint({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'warning';
}): React.JSX.Element {
  return (
    <Typography
      sx={{
        mt: 0.75,
        fontSize: '11px',
        lineHeight: 1.45,
        color: tone === 'warning' ? 'var(--ds-warning)' : 'var(--ds-text-tertiary)',
      }}
    >
      {children}
    </Typography>
  );
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
  hasDependencyBlockers = false,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
}: TaskDrawerMetadataProps): React.JSX.Element {
  // Status options from shared task catalog
  const allStatuses = taskStatuses;
  const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });

  const currentStatusLabel = useMemo(() => {
    const found = allStatuses.find((s) => s.value === status);
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
        <FieldLabel>Status</FieldLabel>
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
            .filter((s) => s.value !== status)
            .map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
        </MUISelect>
        {hasDependencyBlockers && (
          <FieldHint tone="warning">Complete every dependency before changing status.</FieldHint>
        )}
      </Box>

      {/* Priority */}
      <Box>
        <FieldLabel>Priority</FieldLabel>
        <PriorityDropdown
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
          formControlProps={{ fullWidth: true, size: 'small', sx: { margin: 0 } }}
          MenuProps={{ disablePortal: true }}
        />
      </Box>

      {/* Assignee */}
      <Box>
        <FieldLabel>Assignee</FieldLabel>
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

      {/* Due date */}
      <Box>
        <FieldLabel>Due date</FieldLabel>
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
        <FieldHint>Set from the workflow step&rsquo;s effort days. Edit it any time.</FieldHint>
      </Box>

      {/* Project — separated by a hairline rule rather than a full divider */}
      <Box sx={{ height: '1px', bgcolor: 'var(--ds-hairline)', mt: 0.5 }} aria-hidden="true" />

      <Box>
        <FieldLabel>Project</FieldLabel>
        {/* Normal text flow, not flex — the name has to wrap inside a 288px rail. */}
        <MuiLink
          component={NextLink}
          href={projectHref}
          sx={{
            display: 'block',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--ds-link)',
            textDecoration: 'none',
            overflowWrap: 'anywhere',
            '&:hover': { color: 'var(--ds-link-hover)', textDecoration: 'underline' },
          }}
        >
          <Box component="span" sx={{ fontFamily: 'var(--font-mono)', mr: 0.75 }}>
            {projectNumber}
          </Box>
          {projectName}
        </MuiLink>
      </Box>

      {/* Timestamps */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {[
          { label: 'Created', value: createdAt },
          { label: 'Updated', value: updatedAt },
        ].map((stamp) => (
          <Box
            key={stamp.label}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: '11px', color: 'var(--ds-text-tertiary)' }}>
              {stamp.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--ds-text-secondary)',
              }}
            >
              {formatDate(stamp.value)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
