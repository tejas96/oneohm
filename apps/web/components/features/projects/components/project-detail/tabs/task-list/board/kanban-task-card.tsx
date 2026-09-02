'use client';

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CardPreview, PRIORITY_FALLBACK_ICON, PRIORITY_ICON } from './kanban-card-preview';
import { TASK_PRIORITY_HEX_COLOR } from '../../../../../constants';
import type { KanbanColumnData } from '../../../../../hooks/use-project-task-board';
import type { DraggableTaskData } from '../../../../../hooks/use-task-board-dnd';

import { MUIAvatar } from '@/components/ui/mui-avatar';
import { formatDate, getDueDateMuiColor } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface KanbanTaskCardProps {
  taskId: string;
  code: string;
  name: string;
  status: string;
  priority: string;
  assigneeName?: string;
  endDate?: string;
  completionPercentage: number;
  labels?: string[];
  blockedReason?: string;
  isSpecial?: boolean;
  /** Column data for the "Move to" keyboard/mobile menu. */
  allColumns: KanbanColumnData[];
  onOpenTask: (taskId: string) => void;
  onMoveToStatus: (taskId: string, newStatus: string, currentCompletionPct: number) => void;
  /** Whether a drag is currently in progress globally (used to show ghost). */
  isDraggingThis: boolean;
  hasDependencyBlockers?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function KanbanTaskCard({
  taskId,
  code,
  name,
  status,
  priority,
  assigneeName,
  endDate,
  completionPercentage,
  labels = [],
  blockedReason,
  isSpecial = false,
  allColumns,
  onOpenTask,
  onMoveToStatus,
  isDraggingThis,
  hasDependencyBlockers = false,
}: KanbanTaskCardProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewContainer, setPreviewContainer] = useState<HTMLElement | null>(null);

  // Track whether drag was started to suppress click-opens-drawer on drop
  const didDragRef = useRef(false);

  // "Move to" keyboard/mobile menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const priorityColor = TASK_PRIORITY_HEX_COLOR[priority] ?? '#94a3b8';
  const priorityIcon = PRIORITY_ICON[priority] ?? PRIORITY_FALLBACK_ICON;
  const dueDateColor = endDate ? getDueDateMuiColor(endDate) : undefined;
  const isOverdue = dueDateColor === 'error.main';
  const isDueToday = dueDateColor === 'warning.main';
  const visibleLabels = labels.slice(0, 2);
  const extraLabels = labels.length > 2 ? labels.length - 2 : 0;

  // Register draggable
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const payload: DraggableTaskData = {
      type: 'task',
      taskId,
      fromStatus: status,
      taskCompletionPct: completionPercentage,
    };

    return draggable({
      element,
      getInitialData: (): Record<string, unknown> => ({
        ...payload,
      }),
      onGenerateDragPreview({ nativeSetDragImage }) {
        disableNativeDragPreview({ nativeSetDragImage });
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset() {
            return { x: 20, y: 20 };
          },
          render({ container }) {
            setPreviewContainer(container);
            return () => setPreviewContainer(null);
          },
        });
      },
      onDragStart() {
        didDragRef.current = true;
      },
      onDrop() {
        // Reset after 100ms so click handler can check
        setTimeout(() => {
          didDragRef.current = false;
        }, 150);
      },
    });
  }, [taskId, status, completionPercentage]);

  const handleClick = useCallback(() => {
    if (didDragRef.current) return;
    onOpenTask(taskId);
  }, [onOpenTask, taskId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handleMoveMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleMoveMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleMoveToStatus = useCallback(
    (newStatus: string) => {
      onMoveToStatus(taskId, newStatus, completionPercentage);
      setMenuAnchor(null);
    },
    [onMoveToStatus, taskId, completionPercentage],
  );

  return (
    <>
      <Paper
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-roledescription="task card"
        aria-label={`${code} ${name}, status ${status}`}
        aria-grabbed={isDraggingThis}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        elevation={0}
        /*
         * A white card floating on the column's sunken well: `e1` at rest,
         * `e2` and a −1px lift on hover, which is the DS elevation ladder.
         *
         * The old card carried a 1px outline plus a 3px coloured left rule.
         * Both are gone. Urgency is now a 3px inset bar drawn with a box-shadow
         * — the same signal, made of luminance rather than a border, so it
         * cannot fight the card's radius.
         */
        sx={{
          position: 'relative',
          p: 1.5,
          pl: isOverdue || isSpecial || isDueToday ? 2 : 1.5,
          borderRadius: 'var(--radius-r-sm)',
          border: 'none',
          bgcolor: isSpecial ? 'var(--ds-warning-bg)' : 'var(--ds-surface)',
          boxShadow: (() => {
            const accent = isOverdue
              ? 'var(--ds-danger)'
              : isSpecial || isDueToday
                ? 'var(--ds-warning-main)'
                : null;
            const bar = accent ? `inset 3px 0 0 0 ${accent}, ` : '';
            return `${bar}var(--shadow-e1)`;
          })(),
          opacity: isDraggingThis ? 0.45 : 1,
          cursor: 'grab',
          transition:
            'box-shadow 150ms var(--ease-standard), transform 120ms var(--ease-standard), opacity 150ms var(--ease-standard)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: (() => {
              const accent = isOverdue
                ? 'var(--ds-danger)'
                : isSpecial || isDueToday
                  ? 'var(--ds-warning-main)'
                  : null;
              const bar = accent ? `inset 3px 0 0 0 ${accent}, ` : '';
              return `${bar}var(--shadow-e2)`;
            })(),
          },
          '&:focus-visible': {
            outline: '2px solid var(--ds-accent)',
            outlineOffset: 2,
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        {/* Special change-request badge */}
        {isSpecial && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Chip
              icon={<StarRoundedIcon sx={{ fontSize: '14px !important' }} />}
              label="Change Request"
              size="small"
              color="warning"
              sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
            />
          </Box>
        )}

        {/* Labels row */}
        {labels.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {visibleLabels.map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: 'action.hover',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
            {extraLabels > 0 && (
              <Chip
                label={`+${extraLabels}`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: 'action.hover',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            fontWeight: 500,
            lineHeight: 1.4,
            mb: 0.75,
          }}
        >
          {name}
        </Typography>

        {/* Blocked indicator */}
        {blockedReason && (
          <Tooltip title={`Blocked: ${blockedReason}`} placement="top">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                color: 'error.main',
                mb: 0.75,
              }}
            >
              <BlockOutlinedIcon sx={{ fontSize: 12 }} />
              <Typography variant="caption" sx={{ fontSize: 10, color: 'error.main' }}>
                Blocked
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Progress bar */}
        {completionPercentage > 0 && completionPercentage < 100 && (
          <Box sx={{ mb: 0.75 }}>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 3,
                borderRadius: 2,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { borderRadius: 2 },
              }}
            />
          </Box>
        )}

        {/* Due date row */}
        {endDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.25,
                // A flat semantic tint, not a tinted box inside an outline.
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                bgcolor: isOverdue
                  ? 'var(--ds-danger-bg)'
                  : isDueToday
                    ? 'var(--ds-warning-bg)'
                    : 'var(--ds-canvas-sunken)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: dueDateColor ?? 'text.secondary',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                }}
              >
                {formatDate(endDate, 'short')}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Bottom row */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}
        >
          {/* Left: priority + code */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ color: priorityColor, display: 'flex', alignItems: 'center' }}>
              {priorityIcon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              {code}
            </Typography>
            {hasDependencyBlockers && (
              <Tooltip title="Blocked by incomplete dependencies" placement="top">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--ds-warning)',
                    bgcolor: 'var(--ds-warning-bg)',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    px: 0.625,
                    py: 0.25,
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 9 }} />
                </Box>
              </Tooltip>
            )}
          </Box>

          {/* Right: assignee + move button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {assigneeName ? (
              <Tooltip title={assigneeName} placement="top">
                <Box sx={{ display: 'flex' }}>
                  <MUIAvatar name={assigneeName} size="xs" />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Unassigned" placement="top">
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '1px dashed',
                    borderColor: 'text.disabled',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{ fontSize: 10, color: 'text.disabled', lineHeight: 1, fontWeight: 600 }}
                  >
                    ?
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {/* Move to menu for keyboard/mobile */}
            <Tooltip title="Move to…" placement="top">
              <IconButton
                size="small"
                onClick={handleMoveMenuOpen}
                sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
                aria-label="Move task to another status"
              >
                <OpenWithIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* "Move to" menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMoveMenuClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { elevation: 3, sx: { minWidth: 160 } } }}
      >
        {allColumns
          .filter((col) => col.code !== status && col.code !== '__other__')
          .map((col) => (
            <MenuItem key={col.code} onClick={() => handleMoveToStatus(col.code)} dense>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: col.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2">{col.label}</Typography>
              </Box>
            </MenuItem>
          ))}
      </Menu>

      {/* Custom drag preview rendered via portal */}
      {previewContainer &&
        createPortal(
          <CardPreview code={code} name={name} priorityColor={priorityColor} />,
          previewContainer,
        )}
    </>
  );
}

KanbanTaskCard.displayName = 'KanbanTaskCard';
