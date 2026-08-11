'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import type { TaskActivityEntry } from '@tejas96/shared/types';
import { useCallback, useEffect, useState } from 'react';

import { ACTIVITY_TYPE_LABELS } from '../constants';

import { formatRelativeDate } from '@/lib/utils';

interface TaskDrawerMainContentProps {
  description?: string;
  activityLog: TaskActivityEntry[];
  blockedReason?: string;
  completionPercentage?: number;
  hasDependencyBlockers?: boolean;
  onDescriptionChange?: (description: string) => void;
  onAddComment: (comment: string) => void;
  isAddingComment?: boolean;
  hasExtraSections?: boolean;
  /** Rendered between description and activity (e.g. checklist, dependencies) */
  children?: React.ReactNode;
}

/** Signature overline micro-label used for every section in the drawer. */
export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        minHeight: 24,
        mb: 1.5,
      }}
    >
      <Typography
        component="h3"
        sx={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          lineHeight: 1,
          color: 'var(--ds-text-tertiary)',
        }}
      >
        {children}
      </Typography>
      {action}
    </Box>
  );
}

/**
 * Flat semantic callout — a tint plus the signature circular icon container.
 * Replaces the previous `error.50` / `warning.50` backgrounds, which resolved
 * to `undefined` against this theme's palette and rendered transparent.
 */
function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'danger' | 'warning';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const ink = tone === 'danger' ? 'var(--ds-danger)' : 'var(--ds-warning)';
  const tint = tone === 'danger' ? 'var(--ds-danger-bg)' : 'var(--ds-warning-bg)';

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: 'var(--radius-card-functional)',
        bgcolor: tint,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: '50%',
          color: ink,
          bgcolor: 'var(--ds-surface)',
          '& .MuiSvgIcon-root': { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: ink, lineHeight: 1.4 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '12.5px', color: 'var(--ds-text-secondary)', lineHeight: 1.5 }}>
          {children}
        </Typography>
      </Box>
    </Box>
  );
}

/** Small tinted pill used for the from → to values in a status/priority change. */
function ValuePill({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 19,
        px: 0.875,
        borderRadius: 'var(--radius-pill)',
        fontSize: '10.5px',
        fontWeight: 500,
        color: 'var(--ds-text-secondary)',
        bgcolor: 'var(--ds-canvas-sunken)',
      }}
    >
      {children}
    </Box>
  );
}

export function TaskDrawerMainContent({
  description,
  activityLog,
  blockedReason,
  completionPercentage,
  hasDependencyBlockers,
  onDescriptionChange,
  onAddComment,
  isAddingComment,
  hasExtraSections,
  children,
}: TaskDrawerMainContentProps): React.JSX.Element {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(description ?? '');
  const [commentText, setCommentText] = useState('');

  // Keep draftDescription in sync when the saved description changes externally
  // (e.g. optimistic update or concurrent edit) but only when not actively editing
  useEffect(() => {
    if (!isEditingDescription) {
      setDraftDescription(description ?? '');
    }
  }, [description, isEditingDescription]);

  const handleSaveDescription = useCallback(() => {
    if (!onDescriptionChange) return;
    onDescriptionChange(draftDescription);
    setIsEditingDescription(false);
  }, [draftDescription, onDescriptionChange]);

  const handleCancelDescription = useCallback(() => {
    setDraftDescription(description ?? '');
    setIsEditingDescription(false);
  }, [description]);

  const handleSubmitComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText('');
  }, [commentText, onAddComment]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Alerts */}
      {blockedReason && (
        <Callout
          tone="danger"
          icon={<ReportProblemOutlinedIcon />}
          title="This task is blocked"
        >
          {blockedReason}
        </Callout>
      )}

      {hasDependencyBlockers && (
        <Callout tone="warning" icon={<LockOutlinedIcon />} title="Waiting on dependencies">
          Some tasks this one depends on are still open.
        </Callout>
      )}

      {/* Progress */}
      {completionPercentage !== undefined &&
        completionPercentage > 0 &&
        completionPercentage < 100 && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                mb: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--ds-text-tertiary)',
                }}
              >
                Progress
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ds-text-primary)',
                }}
              >
                {completionPercentage}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 5,
                bgcolor: 'var(--ds-canvas-sunken)',
                borderRadius: 'var(--radius-pill)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  borderRadius: 'var(--radius-pill)',
                  bgcolor: 'var(--ds-primary)',
                  transition: 'width var(--dur-emphasised) var(--ease-standard)',
                }}
              />
            </Box>
          </Box>
        )}

      {/* Description */}
      <Box>
        <SectionHeading
          action={
            onDescriptionChange && !isEditingDescription ? (
              <IconButton
                size="small"
                aria-label="Edit description"
                onClick={() => {
                  setDraftDescription(description ?? '');
                  setIsEditingDescription(true);
                }}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 'var(--radius-rf-sm)',
                  color: 'var(--ds-text-tertiary)',
                  '&:hover': {
                    bgcolor: 'var(--ds-canvas-sunken)',
                    color: 'var(--ds-text-primary)',
                  },
                }}
              >
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
            ) : undefined
          }
        >
          Description
        </SectionHeading>

        {isEditingDescription ? (
          <Box>
            <TextField
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              multiline
              rows={6}
              fullWidth
              placeholder="What needs to happen, and anything the next person should know."
              autoFocus
              sx={{
                '& .MuiInputBase-root': {
                  height: 'auto',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  borderRadius: 'var(--radius-card-functional)',
                  padding: '12px 14px',
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveDescription}
                startIcon={<CheckIcon />}
                sx={{ textTransform: 'none', borderRadius: 'var(--radius-pill)', px: 2 }}
              >
                Save description
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleCancelDescription}
                startIcon={<CloseIcon />}
                sx={{
                  textTransform: 'none',
                  borderRadius: 'var(--radius-pill)',
                  px: 2,
                  color: 'var(--ds-text-secondary)',
                  '&:hover': { bgcolor: 'var(--ds-canvas-sunken)' },
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : description ? (
          <Typography
            sx={{
              fontSize: '13px',
              whiteSpace: 'pre-line',
              lineHeight: 1.65,
              color: 'var(--ds-text-secondary)',
            }}
          >
            {description}
          </Typography>
        ) : (
          <Box
            component={onDescriptionChange ? 'button' : 'div'}
            type={onDescriptionChange ? 'button' : undefined}
            onClick={() => {
              if (onDescriptionChange) {
                setIsEditingDescription(true);
              }
            }}
            sx={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              border: 'none',
              px: 1.75,
              py: 1.5,
              fontFamily: 'inherit',
              fontSize: '13px',
              borderRadius: 'var(--radius-card-functional)',
              color: 'var(--ds-text-tertiary)',
              bgcolor: 'var(--ds-canvas-sunken)',
              cursor: onDescriptionChange ? 'pointer' : 'default',
              transition: 'color var(--dur-micro) var(--ease-standard)',
              '&:hover': onDescriptionChange
                ? { color: 'var(--ds-text-secondary)' }
                : undefined,
            }}
          >
            Add a description
          </Box>
        )}
      </Box>

      {hasExtraSections && children}

      {/* Activity */}
      <Box>
        <SectionHeading>Activity</SectionHeading>

        {/* Comment input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
          <TextField
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment"
            fullWidth
            size="small"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            sx={{ '& .MuiInputBase-root': { fontSize: '13px' } }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || isAddingComment}
            sx={{
              textTransform: 'none',
              borderRadius: 'var(--radius-pill)',
              minWidth: 72,
              flexShrink: 0,
            }}
          >
            Send
          </Button>
        </Box>

        {/* Timeline */}
        {activityLog.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              borderRadius: 'var(--radius-card-functional)',
              bgcolor: 'var(--ds-canvas-sunken)',
            }}
          >
            <Typography sx={{ fontSize: '12.5px', color: 'var(--ds-text-tertiary)' }}>
              Nothing has happened on this task yet.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activityLog.map((entry) => {
              const isComment = entry.activityType === 'commented';
              return (
                <Box
                  key={entry.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    // Connector runs from below this marker to the next one.
                    '&:not(:last-of-type) .timeline-connector': {
                      content: '""',
                      position: 'absolute',
                      left: '50%',
                      top: 28,
                      bottom: -22,
                      width: '1px',
                      transform: 'translateX(-50%)',
                      bgcolor: 'var(--ds-hairline)',
                    },
                  }}
                >
                  <Box sx={{ position: 'relative', flexShrink: 0, width: 24 }}>
                    <Box className="timeline-connector" aria-hidden="true" />
                    <Box
                      sx={{
                        position: 'relative',
                        mt: 0.25,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isComment ? 'var(--ds-accent-ink)' : 'var(--ds-text-tertiary)',
                        bgcolor: isComment
                          ? 'var(--ds-accent-subtle)'
                          : 'var(--ds-canvas-sunken)',
                      }}
                    >
                      {isComment ? (
                        <CommentIcon sx={{ fontSize: 13 }} />
                      ) : (
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: 'var(--ds-text-tertiary)',
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, pt: 0.125 }}>
                    {isComment ? (
                      <Box
                        sx={{
                          bgcolor: 'var(--ds-surface-alt)',
                          borderRadius: 'var(--radius-card-functional)',
                          boxShadow: 'var(--shadow-e1)',
                          px: 1.75,
                          py: 1.25,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '13px',
                            lineHeight: 1.55,
                            whiteSpace: 'pre-line',
                            color: 'var(--ds-text-primary)',
                          }}
                        >
                          {entry.newValue}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 0.625,
                          fontSize: '12.5px',
                          color: 'var(--ds-text-secondary)',
                        }}
                      >
                        <Box component="span">
                          {ACTIVITY_TYPE_LABELS[entry.activityType] ?? entry.activityType}
                        </Box>
                        {(entry.fieldName === 'status' || entry.fieldName === 'priority') &&
                          entry.oldValue &&
                          entry.newValue && (
                            <>
                              <ValuePill>{entry.oldValue}</ValuePill>
                              <Box component="span" aria-hidden="true">
                                →
                              </Box>
                              <ValuePill>{entry.newValue}</ValuePill>
                            </>
                          )}
                      </Box>
                    )}
                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: '11px',
                        color: 'var(--ds-text-tertiary)',
                      }}
                    >
                      {formatRelativeDate(entry.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
