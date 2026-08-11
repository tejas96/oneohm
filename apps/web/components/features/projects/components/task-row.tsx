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
  type MyTaskListItem,
  type MyTasksProjectMeta,
} from '@tejas96/shared/types';
import Link from 'next/link';
import type { JSX } from 'react';

import { STALE_THRESHOLDS, TASK_PRIORITY_HEX_COLOR } from '../constants';
import { ColorDotLabel, QuickSelect, type MUISelectOption } from './quick-select';
import { collapseCommentPreview } from '../utils/task-activity';

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

/**
 * Column track shared with the header strip in `collapsible-task-group.tsx`.
 * Kept here so the two never drift — the header imports it rather than
 * repeating the string.
 *
 * The comment preview only earns a column at `lg` (1200px); below that it
 * would squeeze the task name, which is the one thing that must stay
 * readable. It takes 0.6fr against the task cell's 1fr, so the name keeps
 * the larger share whenever both are shown.
 */
export const TASK_ROW_GRID = {
  xs: 'minmax(0,1fr) auto',
  md: 'minmax(0,1fr) 96px 104px 88px 116px',
  lg: 'minmax(0,1fr) minmax(0,0.6fr) 96px 104px 88px 116px',
} as const;

/** Left accent spine. Overdue always wins; otherwise only the loud priorities show. */
function getSpineColor(isOverdue: boolean, priority: TaskPriority): string | null {
  if (isOverdue) return 'var(--ds-danger)';
  if (priority === TaskPriority.URGENT) return 'var(--ds-danger)';
  if (priority === TaskPriority.HIGH) return 'var(--ds-warning-main)';
  return null;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface TaskRowProps {
  task: MyTaskListItem;
  projectMeta?: MyTasksProjectMeta;
  onOpenDrawer: (task: MyTaskListItem) => void;
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
  projectMeta,
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

  const projectStatuses = projectMeta?.taskStatuses ?? [];
  const statusOptions: MUISelectOption[] = projectStatuses.map((s) => ({
    value: s.code,
    label: <ColorDotLabel color={s.color} label={s.label} />,
  }));
  const currentStatusCfg = projectStatuses.find((s) => s.code === task.status);
  const statusColor = currentStatusCfg?.color ?? DEFAULT_STATUS_COLOR[task.status] ?? '#94a3b8';
  const statusLabel = currentStatusCfg?.label ?? TASK_STATUS_LABELS[task.status] ?? task.status;

  const dueDateMuiColor = task.endDate ? getDueDateMuiColor(task.endDate) : 'text.disabled';
  const dueDatePendingLabel = task.endDate ? formatDueDatePendingLabel(task.endDate) : '';
  const latestComment = task.latestCommentPreview;
  const commentPreview = latestComment ? collapseCommentPreview(latestComment) : null;
  const spineColor = getSpineColor(isOverdue, task.priority);

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
        gridTemplateColumns: TASK_ROW_GRID,
        alignItems: 'center',
        columnGap: { xs: 1.5, md: 2 },
        pl: 2.5,
        pr: 2,
        py: 1.25,
        cursor: 'pointer',
        transition: 'background-color var(--dur-micro) var(--ease-standard)',
        bgcolor: isFocused ? 'var(--ds-accent-subtle)' : 'transparent',
        // Hairline in the sunken-canvas tone rather than `divider` — present
        // enough to keep a 40-row list scannable, quiet enough not to read as
        // a table border.
        boxShadow: 'inset 0 -1px 0 var(--ds-canvas-sunken)',
        outline: isFocused ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: '-2px',
        '&:last-of-type': { boxShadow: 'none' },
        '&:hover': {
          bgcolor: isFocused ? 'var(--ds-accent-subtle)' : 'var(--ds-surface-alt)',
        },
      }}
    >
      {/* Left accent spine — carries overdue / urgency, replacing a row-wide tint */}
      {spineColor && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            bgcolor: spineColor,
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}

      {/* Col 1 — Task: name on top, identifiers beneath */}
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          {isOverdue && (
            <Tooltip title="Overdue" placement="top">
              <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main', flexShrink: 0 }} />
            </Tooltip>
          )}
          <Typography
            noWrap
            sx={{
              fontSize: '13.5px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              lineHeight: 1.35,
              minWidth: 0,
            }}
          >
            {task.name || task.code || 'Untitled'}
          </Typography>
          {task.hasDependencyBlockers && (
            <Tooltip title="Blocked by incomplete dependencies" placement="top">
              <LockOutlinedIcon sx={{ fontSize: 14, color: 'warning.dark', flexShrink: 0 }} />
            </Tooltip>
          )}
          {isStale && (
            <Tooltip title={`No updates in ${daysStale} days`} placement="top">
              <Box
                component="span"
                sx={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '15px',
                  px: 0.625,
                  borderRadius: 'var(--radius-pill)',
                  color: 'var(--ds-warning)',
                  bgcolor: 'var(--ds-warning-bg)',
                }}
              >
                {daysStale}d
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Identifier line — code · project · milestone */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mt: 0.25,
            minWidth: 0,
            color: 'var(--ds-text-tertiary)',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          <Box component="span" sx={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {task.code}
          </Box>
          <Box component="span" aria-hidden="true" sx={{ flexShrink: 0 }}>
            ·
          </Box>
          <Link
            href={projectDetailHref}
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            <Box
              component="span"
              sx={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--ds-text-tertiary)',
                transition: 'color var(--dur-micro) var(--ease-standard)',
                '&:hover': { color: 'var(--ds-link)' },
              }}
            >
              {task.projectNumber}
            </Box>
          </Link>
          {task.milestoneName && (
            <>
              <Box component="span" aria-hidden="true" sx={{ flexShrink: 0 }}>
                ·
              </Box>
              <Box
                component="span"
                sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {task.milestoneName}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Col 2 — Latest comment (lg and up; below that the name needs the room) */}
      <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0 }}>
        {commentPreview ? (
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
            <Typography
              noWrap
              aria-hidden="true"
              sx={{
                fontSize: '11.5px',
                lineHeight: 1.45,
                color: 'var(--ds-text-tertiary)',
              }}
            >
              {commentPreview}
            </Typography>
          </Tooltip>
        ) : null}
      </Box>

      {/* Col 3 — Priority */}
      <Box
        sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {onPriorityChange ? (
          <QuickSelect
            pill
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
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: priorityColor,
              }}
            />
            <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
              {priorityLabel}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Col 4 — Due date */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        {task.endDate ? (
          <Tooltip title={formatRelativeDate(task.endDate)} placement="top">
            <Box>
              <Typography
                sx={{
                  whiteSpace: 'nowrap',
                  fontSize: '12.5px',
                  fontWeight: isOverdue ? 600 : 400,
                  lineHeight: 1.3,
                  color: dueDateMuiColor,
                }}
              >
                {formatDate(task.endDate, 'short')}
              </Typography>
              {dueDatePendingLabel ? (
                <Typography
                  sx={{
                    display: 'block',
                    whiteSpace: 'nowrap',
                    fontSize: '10.5px',
                    lineHeight: 1.4,
                    fontWeight: isOverdue ? 500 : 400,
                    color: isOverdue ? dueDateMuiColor : 'var(--ds-text-tertiary)',
                  }}
                >
                  {dueDatePendingLabel}
                </Typography>
              ) : null}
            </Box>
          </Tooltip>
        ) : (
          <Typography sx={{ fontSize: '12.5px', color: 'var(--ds-text-tertiary)' }}>—</Typography>
        )}
      </Box>

      {/* Col 5 — Progress */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            height: 4,
            borderRadius: 'var(--radius-pill)',
            bgcolor: 'var(--ds-canvas-sunken)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              borderRadius: 'var(--radius-pill)',
              bgcolor:
                task.completionPercentage >= 100 ? 'var(--ds-success-main)' : 'var(--ds-primary)',
              width: `${task.completionPercentage}%`,
              transition: 'width var(--dur-emphasised) var(--ease-standard)',
            }}
          />
        </Box>
        <Typography
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          }}
        >
          {task.completionPercentage}%
        </Typography>
      </Box>

      {/* Col 6 — Status */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          // Hug the label — stretching would make every chip the same wide box.
          justifySelf: { xs: 'end', md: 'start' },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {onStatusChange && statusOptions.length > 0 ? (
          <QuickSelect
            pill
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
              height: 23,
              borderRadius: 'var(--radius-pill)',
              bgcolor: `${statusColor}14`,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: statusColor,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ color: statusColor, fontWeight: 500, fontSize: '11px' }}>
              {statusLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
