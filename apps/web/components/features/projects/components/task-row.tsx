'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  TaskPriority,
  TaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@tejas96/shared/types';
import Link from 'next/link';
import type { JSX } from 'react';

import { STALE_THRESHOLDS, TASK_PRIORITY_HEX_COLOR } from '../constants';
import type { MyTask } from '../hooks';
import { ColorDotLabel, QuickSelect, type MUISelectOption } from './quick-select';
import { collapseCommentPreview, getLatestTaskComment } from '../utils/task-activity';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  formatDate,
  formatDueDatePendingLabel,
  formatRelativeDate,
  getDueDateMuiColor,
} from '@/lib/utils';

// ── Module-level constants ──────────────────────────────────────────────────

const PRIORITY_OPTIONS: MUISelectOption[] = (
  Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]
).map((code) => ({
  value: code,
  label: (
    <ColorDotLabel
      color={TASK_PRIORITY_HEX_COLOR[code] ?? '#94a3b8'}
      label={TASK_PRIORITY_LABELS[code]}
    />
  ),
}));

const DEFAULT_STATUS_COLOR: Record<string, string> = {
  [TaskStatus.BACKLOG]: '#94a3b8',
  [TaskStatus.TODO]: '#60a5fa',
  [TaskStatus.IN_PROGRESS]: '#f59e0b',
  [TaskStatus.IN_REVIEW]: '#a78bfa',
  [TaskStatus.TESTING]: '#ec4899',
  [TaskStatus.BLOCKED]: '#ef4444',
  [TaskStatus.DONE]: '#22c55e',
  [TaskStatus.CANCELLED]: '#6b7280',
};

// ── Props ────────────────────────────────────────────────────────────────────

export interface TaskRowProps {
  task: MyTask;
  onOpenDrawer: (task: MyTask) => void;
  onStatusChange?: (
    taskId: string,
    newStatus: string,
    currentStatus: string,
    currentCompletionPct: number,
  ) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
  isFocused?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TaskRow({
  task,
  onOpenDrawer,
  onStatusChange,
  onPriorityChange,
  isFocused,
}: TaskRowProps): JSX.Element {
  const projectDetailHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: task.projectId });
  const isOverdue = Boolean(task.isOverdue);
  const daysStale = task.daysSinceLastUpdate ?? 0;
  const staleThreshold = STALE_THRESHOLDS[task.status];
  const isStale = staleThreshold !== undefined && daysStale >= staleThreshold;

  const priorityColor = TASK_PRIORITY_HEX_COLOR[task.priority] ?? '#94a3b8';
  const priorityLabel = TASK_PRIORITY_LABELS[task.priority] ?? task.priority;

  const projectStatuses = task.projectTaskStatuses ?? [];
  const statusOptions: MUISelectOption[] = projectStatuses.map((s) => ({
    value: s.code,
    label: <ColorDotLabel color={s.color} label={s.label} />,
  }));
  const currentStatusCfg = projectStatuses.find((s) => s.code === task.status);
  const statusColor = currentStatusCfg?.color ?? DEFAULT_STATUS_COLOR[task.status] ?? '#94a3b8';
  const statusLabel = currentStatusCfg?.label ?? TASK_STATUS_LABELS[task.status] ?? task.status;

  const dueDateMuiColor = task.endDate ? getDueDateMuiColor(task.endDate) : 'text.disabled';
  const dueDatePendingLabel = task.endDate ? formatDueDatePendingLabel(task.endDate) : '';
  const latestComment = getLatestTaskComment(task.activityLog);
  const commentPreview = latestComment ? collapseCommentPreview(latestComment) : null;

  return (
    <Box
      data-task-row
      onClick={() => onOpenDrawer(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDrawer(task);
        }
      }}
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: {
          xs: '72px 1fr',
          md: '72px 1fr 112px 96px 80px 80px 104px',
        },
        alignItems: 'start',
        gap: { xs: 1, md: 1.5 },
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        bgcolor: isOverdue ? 'rgba(220,38,38,0.06)' : 'background.paper',
        outline: isFocused ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: '-2px',
        '&:last-of-type': { borderBottom: 'none' },
        '&:hover': {
          bgcolor: isOverdue ? 'rgba(220,38,38,0.1)' : 'action.hover',
        },
      }}
    >
      {/* Left priority accent stripe */}
      {(isOverdue || task.priority === TaskPriority.URGENT) && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            bgcolor: isOverdue ? 'error.main' : 'warning.main',
            borderRadius: '2px 0 0 2px',
          }}
        />
      )}

      {/* Col 1 — Key */}
      <Typography
        variant="caption"
        noWrap
        sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 500 }}
      >
        {task.code}
      </Typography>

      {/* Col 2 — Summary */}
      <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          {isOverdue && (
            <WarningAmberIcon sx={{ fontSize: 13, color: 'error.main', flexShrink: 0 }} />
          )}
          <Typography
            variant="body2"
            fontWeight={500}
            noWrap
            sx={{
              color: 'text.primary',
              lineHeight: 1.4,
              flexShrink: 1,
              minWidth: 0,
              maxWidth: latestComment ? '42%' : '100%',
            }}
          >
            {task.name || task.code || 'Untitled'}
          </Typography>
          {latestComment && (
            <Tooltip
              title={
                <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                  {latestComment}
                </Box>
              }
              placement="top"
              describeChild
              slotProps={{ tooltip: { sx: { maxWidth: 360 } } }}
            >
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography
                  variant="caption"
                  noWrap
                  aria-hidden="true"
                  sx={{
                    color: 'text.disabled',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.4,
                    maxWidth: '100%',
                  }}
                >
                  {commentPreview}
                </Typography>
              </Box>
            </Tooltip>
          )}
          {task.hasDependencyBlockers && (
            <Tooltip title="Blocked by incomplete dependencies" placement="top">
              <LockOutlinedIcon sx={{ fontSize: 13, color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
          {isStale && (
            <Tooltip title={`No updates in ${daysStale} days`} placement="top">
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'warning.main', flexShrink: 0, fontSize: '0.6875rem' }}
              >
                {daysStale}d
              </Typography>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <Link
            href={projectDetailHref}
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none' }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color: 'text.disabled',
                '&:hover': { color: 'primary.main' },
                transition: 'color 0.15s',
              }}
            >
              {task.projectNumber}
            </Typography>
          </Link>
        </Box>
      </Box>

      {/* Col 3 — Milestone (desktop only) */}
      <Typography
        variant="caption"
        noWrap
        sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
      >
        {task.milestoneName ?? (
          <Typography
            component="span"
            variant="caption"
            sx={{ color: 'text.disabled', fontStyle: 'italic' }}
          >
            —
          </Typography>
        )}
      </Typography>

      {/* Col 4 — Priority (desktop only) */}
      <Box
        sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {onPriorityChange ? (
          <QuickSelect
            value={task.priority}
            color={priorityColor}
            label={priorityLabel}
            options={PRIORITY_OPTIONS}
            onChange={(v) => onPriorityChange(task.id, v)}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: priorityColor,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', textTransform: 'capitalize' }}
            >
              {priorityLabel}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Col 5 — Due date (desktop only) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 0.25 }}>
        {task.endDate ? (
          <Tooltip title={formatRelativeDate(task.endDate)} placement="top">
            <Box>
              <Typography
                variant="caption"
                sx={{
                  whiteSpace: 'nowrap',
                  fontWeight: isOverdue ? 600 : 400,
                  color: dueDateMuiColor,
                }}
              >
                {formatDate(task.endDate, 'short')}
              </Typography>
              {dueDatePendingLabel ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    whiteSpace: 'nowrap',
                    fontSize: '0.625rem',
                    fontWeight: isOverdue ? 500 : 400,
                    color: dueDateMuiColor,
                  }}
                >
                  {dueDatePendingLabel}
                </Typography>
              ) : null}
            </Box>
          </Tooltip>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            —
          </Typography>
        )}
      </Box>

      {/* Col 7 — Progress (desktop only) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75 }}>
        <Box
          sx={{
            width: 40,
            height: 5,
            borderRadius: 1,
            bgcolor: 'action.hover',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              height: '100%',
              borderRadius: 1,
              bgcolor: 'primary.main',
              width: `${task.completionPercentage}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {task.completionPercentage}%
        </Typography>
      </Box>

      {/* Col 8 — Status dropdown (desktop only) */}
      <Box
        sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {onStatusChange && statusOptions.length > 0 ? (
          <QuickSelect
            value={task.status}
            color={statusColor}
            label={statusLabel}
            options={statusOptions}
            onChange={(v) => onStatusChange(task.id, v, task.status, task.completionPercentage)}
            disabled={Boolean(task.hasDependencyBlockers)}
          />
        ) : (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1,
              py: 0.25,
              borderRadius: 10,
              border: '1px solid',
              borderColor: `${statusColor}30`,
              bgcolor: `${statusColor}15`,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: statusColor,
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: statusColor, fontWeight: 500, fontSize: '11px' }}
            >
              {statusLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
