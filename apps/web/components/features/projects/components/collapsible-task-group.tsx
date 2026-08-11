'use client';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { MyTaskListItem, MyTasksProjectMeta } from '@tejas96/shared/types';
import { useEffect, useState } from 'react';

import { TASK_GROUP_VARIANT_MAP } from '../constants';
import { TaskRow, TASK_ROW_GRID } from './task-row';

import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_GROUP_VARIANT = {
  dot: 'bg-foreground-tertiary',
  border: 'border-border-light',
  leftBorder: 'border-l-border',
  badge: 'secondary',
};

/**
 * Group accent — a readable ink for the overline plus a matching tint for the
 * count pill. Derived from the existing variant map's dot class so group
 * colours stay defined in one place.
 */
const GROUP_ACCENT = {
  error: { ink: 'var(--ds-danger)', tint: 'var(--ds-danger-bg)' },
  warning: { ink: 'var(--ds-warning)', tint: 'var(--ds-warning-bg)' },
  info: { ink: 'var(--ds-info)', tint: 'var(--ds-info-bg)' },
  success: { ink: 'var(--ds-success)', tint: 'var(--ds-success-bg)' },
  primary: { ink: 'var(--ds-accent-ink)', tint: 'var(--ds-accent-subtle)' },
  neutral: { ink: 'var(--ds-text-secondary)', tint: 'var(--ds-canvas-sunken)' },
} satisfies Record<string, { ink: string; tint: string }>;

function accentFromDotClass(dotClass: string): { ink: string; tint: string } {
  if (dotClass.includes('error')) return GROUP_ACCENT.error;
  if (dotClass.includes('warning')) return GROUP_ACCENT.warning;
  if (dotClass.includes('info')) return GROUP_ACCENT.info;
  if (dotClass.includes('success')) return GROUP_ACCENT.success;
  if (dotClass.includes('primary')) return GROUP_ACCENT.primary;
  return GROUP_ACCENT.neutral;
}

/** Header labels, in the same order as the row's grid tracks. */
const COLUMNS = [
  { label: 'Task', from: 'md' },
  { label: 'Latest activity', from: 'lg' },
  { label: 'Priority', from: 'md' },
  { label: 'Due', from: 'md' },
  { label: 'Progress', from: 'md' },
  { label: 'Status', from: 'md' },
] as const;

interface CollapsibleTaskGroupProps {
  groupKey: string;
  label: string;
  count: number;
  tasks: MyTaskListItem[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: (task: MyTaskListItem) => void;
  onStatusChange?: (
    taskId: string,
    newStatus: string,
    currentStatus: string,
    currentCompletionPct: number,
  ) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
  focusedTaskId?: string;
  projectMeta?: Record<string, MyTasksProjectMeta>;
  isLoadingTasks?: boolean;
  isTasksError?: boolean;
  onRetryTasks?: () => void;
}

const INITIAL_VISIBLE_COUNT = 5;

export function CollapsibleTaskGroup({
  groupKey,
  label,
  count,
  tasks,
  expanded,
  onToggleExpand,
  onOpenDrawer,
  onStatusChange,
  onPriorityChange,
  focusedTaskId,
  projectMeta = {},
  isLoadingTasks = false,
  isTasksError = false,
  onRetryTasks,
}: CollapsibleTaskGroupProps): React.JSX.Element {
  const [showAll, setShowAll] = useState(false);

  // Collapse "show all" if the list shrinks back below the threshold (e.g. after marking done)
  useEffect(() => {
    if (tasks.length <= INITIAL_VISIBLE_COUNT) {
      setShowAll(false);
    }
  }, [tasks.length]);

  const variant = TASK_GROUP_VARIANT_MAP[groupKey] ?? DEFAULT_GROUP_VARIANT;
  const visibleTasks = showAll ? tasks : tasks.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = Math.max(0, tasks.length - INITIAL_VISIBLE_COUNT);
  const accent = accentFromDotClass(variant.dot);

  return (
    <Box>
      {/* Group header — overline micro-label on the bare canvas */}
      <Box
        component="button"
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          py: 1,
          px: 0.5,
          color: 'inherit',
          '&:hover .group-caret': { color: 'var(--ds-text-secondary)' },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            lineHeight: 1,
            color: accent.ink,
          }}
        >
          {label}
        </Typography>

        <Box
          component="span"
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            fontWeight: 500,
            lineHeight: '18px',
            minWidth: 18,
            px: 0.75,
            textAlign: 'center',
            borderRadius: 'var(--radius-pill)',
            color: accent.ink,
            bgcolor: accent.tint,
          }}
        >
          {count}
        </Box>

        {/* Hairline reaching to the caret — reads as a rule, not a border */}
        <Box
          aria-hidden="true"
          sx={{ flex: 1, height: '1px', bgcolor: 'var(--ds-canvas-sunken)' }}
        />

        <ExpandMoreIcon
          className="group-caret"
          sx={{
            fontSize: 18,
            color: 'var(--ds-text-tertiary)',
            flexShrink: 0,
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition:
              'transform var(--dur-standard) var(--ease-standard), color var(--dur-micro)',
          }}
        />
      </Box>

      {/* Task card */}
      <Collapse in={expanded} timeout={200}>
        <Box
          sx={{
            bgcolor: 'var(--ds-surface)',
            borderRadius: 'var(--radius-card-functional)',
            boxShadow: 'var(--shadow-e2)',
            overflow: 'hidden',
            mb: 1.5,
            transition: 'box-shadow var(--dur-standard) var(--ease-standard)',
            '&:hover': { boxShadow: 'var(--shadow-e3)' },
          }}
        >
          {/* Column header — same grid tracks as the row */}
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: TASK_ROW_GRID,
              alignItems: 'center',
              columnGap: 2,
              pl: 2.5,
              pr: 2,
              py: 1,
              bgcolor: 'var(--ds-surface-alt)',
            }}
          >
            {COLUMNS.map((col) => (
              <Typography
                key={col.label}
                noWrap
                sx={{
                  display: col.from === 'lg' ? { xs: 'none', lg: 'block' } : 'block',
                  color: 'var(--ds-text-tertiary)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '9.5px',
                  lineHeight: 1.4,
                }}
              >
                {col.label}
              </Typography>
            ))}
          </Box>

          {isTasksError && !isLoadingTasks ? (
            <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '12px', color: 'error.main', display: 'block', mb: 1 }}>
                Could not load tasks for this group.
              </Typography>
              {onRetryTasks ? (
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  sx={{ cursor: 'pointer', fontSize: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryTasks();
                  }}
                >
                  Retry
                </Link>
              ) : null}
            </Box>
          ) : null}

          {isLoadingTasks && tasks.length === 0 && !isTasksError ? (
            <Box sx={{ px: 2.5, py: 2 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="mb-2 h-8 w-full rounded-md" />
              ))}
            </Box>
          ) : null}

          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectMeta={projectMeta[task.projectId]}
              onOpenDrawer={onOpenDrawer}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              isFocused={focusedTaskId === task.id}
            />
          ))}

          {hiddenCount > 0 && (
            <Box
              component="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll((prev) => !prev);
              }}
              sx={{
                display: 'block',
                width: '100%',
                border: 'none',
                cursor: 'pointer',
                py: 1.25,
                fontSize: '11.5px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                color: 'var(--ds-text-secondary)',
                bgcolor: 'var(--ds-surface-alt)',
                transition: 'background-color var(--dur-micro) var(--ease-standard)',
                '&:hover': { bgcolor: 'var(--ds-canvas-sunken)', color: 'var(--ds-text-primary)' },
              }}
            >
              {showAll ? 'Show less' : `Show ${hiddenCount} more`}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
