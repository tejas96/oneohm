'use client';

import CheckIcon from '@mui/icons-material/Check';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RemoveIcon from '@mui/icons-material/Remove';
import SouthIcon from '@mui/icons-material/South';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { TaskPriority, TaskStatus } from '@oneohm-epc/shared/types';
import Link from 'next/link';
import type { JSX } from 'react';

import { STALE_THRESHOLDS } from '../constants';
import type { MyTask } from '../hooks';

import { Progress } from '@/components/ui/progress';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatRelativeDate } from '@/lib/utils';

// MUI-safe color map — mirrors the Tailwind/MUI theme token values
const DUE_DATE_COLOR = {
  overdue: '#dc2626', // error.main
  today: '#eab308', // warning.main
  future: '#71717a', // text.disabled (foreground-tertiary)
} as const;

function getDueDateSxColor(endDate: string): string {
  const d = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (d < now) return DUE_DATE_COLOR.overdue;
  if (d.getTime() === now.getTime()) return DUE_DATE_COLOR.today;
  return DUE_DATE_COLOR.future;
}

interface PriorityConfig {
  label: string;
  color: string;
  Icon: typeof RemoveIcon;
}

const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  [TaskPriority.URGENT]: { label: 'Urgent', color: 'error.main', Icon: KeyboardDoubleArrowUpIcon },
  [TaskPriority.HIGH]: { label: 'High', color: 'warning.main', Icon: KeyboardDoubleArrowUpIcon },
  [TaskPriority.MEDIUM]: { label: 'Medium', color: 'text.disabled', Icon: RemoveIcon },
  [TaskPriority.LOW]: { label: 'Low', color: 'text.disabled', Icon: SouthIcon },
  [TaskPriority.NORMAL]: { label: 'Normal', color: 'text.disabled', Icon: RemoveIcon },
};

/** Priority badge — icon + label so it's immediately readable at a glance */
function PriorityBadge({ priority }: { priority: TaskPriority }): JSX.Element {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[TaskPriority.NORMAL];
  const { label, color, Icon } = cfg;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: 13, color }} />
      <Typography variant="caption" sx={{ color, fontWeight: 500, lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

interface TaskRowProps {
  task: MyTask;
  onOpenDrawer: (task: MyTask) => void;
  onMarkDone: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  isFocused?: boolean;
}

export function TaskRow({
  task,
  onOpenDrawer,
  onMarkDone,
  onStartTask,
  isFocused,
}: TaskRowProps): JSX.Element {
  const projectDetailHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: task.projectId });
  const isOverdue = Boolean(task.isOverdue);
  const daysStale = task.daysSinceLastUpdate ?? 0;
  const staleThreshold = STALE_THRESHOLDS[task.status];
  const isStale = staleThreshold !== undefined && daysStale >= staleThreshold;

  // Don't offer "Start" on already-active or terminal statuses
  const canStart =
    task.status !== TaskStatus.IN_PROGRESS &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.CANCELLED;
  // Don't offer "Mark Done" on already-done or cancelled
  const canMarkDone = task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED;

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
        position: 'relative', // required for the absolute priority stripe child
        display: 'flex',
        alignItems: 'center',
        gap: 1,
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
        // Quick actions + status button hidden by default on desktop, shown on hover
        '& .row-hover-actions': {
          opacity: { xs: 1, sm: 0 },
          transition: 'opacity 0.15s',
        },
        '&:hover .row-hover-actions': {
          opacity: 1,
        },
      }}
    >
      {/* Left priority / overdue accent stripe */}
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

      {/* Task info — fills available width, overflow:hidden enforces noWrap on the title */}
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* Title line */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          {isOverdue && (
            <WarningAmberIcon sx={{ fontSize: 13, color: 'error.main', flexShrink: 0 }} />
          )}
          <Typography
            variant="body2"
            fontWeight={500}
            noWrap
            sx={{ color: 'text.primary', lineHeight: 1.4 }}
          >
            {task.name || task.code || 'Untitled'}
          </Typography>
          {isStale && (
            <Tooltip title={`No updates in ${daysStale} days`} placement="top">
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'warning.main',
                  flexShrink: 0,
                  fontSize: '0.6875rem',
                }}
              >
                {daysStale}d
              </Typography>
            </Tooltip>
          )}
        </Box>

        {/* Metadata: project · task code */}
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
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            ·
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
            {task.code}
          </Typography>
        </Box>

        {/* Progress bar — only when partially complete */}
        {task.completionPercentage > 0 && task.completionPercentage < 100 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box sx={{ width: 96 }}>
              <Progress value={task.completionPercentage} size="sm" />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {task.completionPercentage}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right side: fixed-width slots so alignment never shifts */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {/* Priority — fixed width so absent due-date doesn't shift it */}
        <Box sx={{ width: 72, display: 'flex', justifyContent: 'flex-end' }}>
          <PriorityBadge priority={task.priority} />
        </Box>

        {/* Due date — fixed width, empty placeholder when not set */}
        <Box sx={{ width: 120, display: 'flex', justifyContent: 'flex-end' }}>
          {task.endDate && (
            <Typography
              variant="caption"
              sx={{ whiteSpace: 'nowrap', fontWeight: 500, color: getDueDateSxColor(task.endDate) }}
            >
              {formatRelativeDate(task.endDate)}
            </Typography>
          )}
        </Box>

        {/* Quick action buttons — hover-reveal, fixed width so row height stays constant */}
        <Box
          className="row-hover-actions"
          sx={{
            width: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.5,
          }}
        >
          {canStart && (
            <Tooltip title="Start task" placement="top">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTask(task.id);
                }}
                sx={{
                  color: 'info.main',
                  bgcolor: 'rgba(14,165,233,0.1)',
                  width: 24,
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(14,165,233,0.18)' },
                }}
              >
                <PlayArrowIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          {canMarkDone && (
            <Tooltip title="Mark done" placement="top">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone(task.id);
                }}
                sx={{
                  color: 'success.main',
                  bgcolor: 'rgba(34,197,94,0.1)',
                  width: 24,
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(34,197,94,0.18)' },
                }}
              >
                <CheckIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}
