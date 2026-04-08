'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { TASK_GROUP_VARIANT_MAP } from '../constants';
import type { MyTask } from '../hooks';
import { TaskRow } from './task-row';

const INITIAL_VISIBLE_COUNT = 5;

const DEFAULT_GROUP_VARIANT = {
  dot: 'bg-foreground-tertiary',
  border: 'border-border-light',
  leftBorder: 'border-l-border',
  badge: 'secondary',
};

/** Map our internal badge variant name to MUI Chip color */
function badgeToMuiColor(badge: string): 'error' | 'warning' | 'info' | 'success' | 'default' {
  switch (badge) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    default:
      return 'default';
  }
}

/** Map our internal dot CSS class to an MUI palette color */
function dotClassToColor(dotClass: string): string {
  if (dotClass.includes('error')) return 'error.main';
  if (dotClass.includes('warning')) return 'warning.main';
  if (dotClass.includes('info')) return 'info.main';
  if (dotClass.includes('success')) return 'success.main';
  if (dotClass.includes('primary')) return 'primary.main';
  return 'text.disabled';
}

interface CollapsibleTaskGroupProps {
  groupKey: string;
  label: string;
  count: number;
  tasks: MyTask[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: (task: MyTask) => void;
  onMarkDone: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  focusedTaskId?: string;
}

export function CollapsibleTaskGroup({
  groupKey,
  label,
  count,
  tasks,
  expanded,
  onToggleExpand,
  onOpenDrawer,
  onMarkDone,
  onStartTask,
  focusedTaskId,
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
  const chipColor = badgeToMuiColor(variant.badge);
  const dotColor = dotClassToColor(variant.dot);

  /** Left-edge accent color derived from dot class */
  const leftAccentColor = dotColor;

  return (
    <Box>
      {/* Group header */}
      <Box
        component="button"
        type="button"
        onClick={onToggleExpand}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          py: 0.75,
          px: 0,
          color: 'inherit',
          '&:hover .group-label': { color: 'text.primary' },
        }}
      >
        {expanded ? (
          <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        ) : (
          <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        )}

        {/* Colored dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: dotColor,
            flexShrink: 0,
          }}
        />

        {/* Label */}
        <Typography
          className="group-label"
          variant="caption"
          fontWeight={600}
          sx={{
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'text.secondary',
            transition: 'color 0.15s',
          }}
        >
          {label}
        </Typography>

        {/* Count badge */}
        <Chip
          label={count}
          size="small"
          color={chipColor}
          variant="outlined"
          sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
        />
      </Box>

      {/* Collapsible task list */}
      <Collapse in={expanded} timeout={200}>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            borderLeft: '3px solid',
            borderLeftColor: leftAccentColor,
            overflow: 'hidden',
            mb: 0.5,
          }}
        >
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpenDrawer={onOpenDrawer}
              onMarkDone={onMarkDone}
              onStartTask={onStartTask}
              isFocused={focusedTaskId === task.id}
            />
          ))}

          {hiddenCount > 0 && (
            <>
              <Divider />
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Link
                  component="button"
                  type="button"
                  variant="caption"
                  underline="hover"
                  sx={{ color: 'text.disabled', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll((prev) => !prev);
                  }}
                >
                  {showAll ? 'Show less' : `Show ${hiddenCount} more\u2026`}
                </Link>
              </Box>
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
