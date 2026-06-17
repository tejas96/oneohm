'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Button, Chip, Divider, IconButton, TextField } from '@mui/material';
import type { TaskActivityEntry } from '@tejas96/shared/types';
import { useCallback, useEffect, useState } from 'react';

import { ACTIVITY_TYPE_LABELS } from '../constants';

import { MUITypography } from '@/components/ui/mui-typography';
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
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: 'error.50',
            borderLeft: 3,
            borderColor: 'error.main',
            borderRadius: 1,
          }}
        >
          <MUITypography variant="alertTitle" sx={{ color: 'error.main' }}>
            Blocked
          </MUITypography>
          <MUITypography variant="body">{blockedReason}</MUITypography>
        </Box>
      )}

      {hasDependencyBlockers && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: 'warning.50',
            borderLeft: 3,
            borderColor: 'warning.main',
            borderRadius: 1,
          }}
        >
          <MUITypography variant="alertTitle" sx={{ color: 'warning.main' }}>
            Blocked by Dependencies
          </MUITypography>
          <MUITypography variant="body">Some dependency tasks are not yet complete</MUITypography>
        </Box>
      )}

      {/* Progress indicator */}
      {completionPercentage !== undefined &&
        completionPercentage > 0 &&
        completionPercentage < 100 && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.75,
              }}
            >
              <MUITypography variant="alertTitle" sx={{ color: 'text.secondary' }}>
                Progress
              </MUITypography>
              <MUITypography variant="alertTitle" sx={{ color: 'text.primary' }}>
                {completionPercentage}%
              </MUITypography>
            </Box>
            <Box
              sx={{
                height: 6,
                bgcolor: 'action.hover',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  bgcolor: 'primary.main',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        )}

      {/* Description Section */}
      <Box>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <MUITypography variant="sectionTitle">Description</MUITypography>
          {onDescriptionChange && !isEditingDescription && (
            <IconButton
              size="small"
              onClick={() => {
                setDraftDescription(description ?? '');
                setIsEditingDescription(true);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>

        {isEditingDescription ? (
          <Box>
            <TextField
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              multiline
              rows={6}
              fullWidth
              placeholder="Add a description..."
              autoFocus
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveDescription}
                startIcon={<CheckIcon />}
                sx={{ textTransform: 'none' }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancelDescription}
                startIcon={<CloseIcon />}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : description ? (
          <MUITypography variant="body" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {description}
          </MUITypography>
        ) : (
          <MUITypography
            variant="placeholder"
            sx={{ cursor: onDescriptionChange ? 'pointer' : 'default' }}
            onClick={() => {
              if (onDescriptionChange) {
                setIsEditingDescription(true);
              }
            }}
          >
            Add a description...
          </MUITypography>
        )}
      </Box>

      {hasExtraSections && (
        <>
          <Divider />
          {children}
        </>
      )}

      <Divider />

      {/* Activity Section */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 2 }}>
          Activity
        </MUITypography>

        {/* Comment input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            fullWidth
            size="small"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.875rem',
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || isAddingComment}
            sx={{ textTransform: 'none', minWidth: 70 }}
          >
            Send
          </Button>
        </Box>

        {/* Activity timeline */}
        {activityLog.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <MUITypography variant="body">No activity yet</MUITypography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {activityLog.map((entry) => (
              <Box key={entry.id} sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    mt: 0.5,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: entry.activityType === 'commented' ? 'primary.50' : 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {entry.activityType === 'commented' ? (
                    <CommentIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  ) : (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'text.disabled',
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {entry.activityType === 'commented' ? (
                    <Box
                      sx={{
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <MUITypography variant="bodyPrimary">{entry.newValue}</MUITypography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 0.5,
                      }}
                    >
                      <MUITypography variant="body" component="span">
                        {ACTIVITY_TYPE_LABELS[entry.activityType] ?? entry.activityType}
                      </MUITypography>
                      {(entry.fieldName === 'status' || entry.fieldName === 'priority') &&
                        entry.oldValue &&
                        entry.newValue && (
                          <>
                            <MUITypography variant="body" component="span">
                              from
                            </MUITypography>
                            <Chip
                              label={entry.oldValue}
                              size="small"
                              sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                            <MUITypography variant="body" component="span">
                              to
                            </MUITypography>
                            <Chip
                              label={entry.newValue}
                              size="small"
                              sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                          </>
                        )}
                    </Box>
                  )}
                  <MUITypography variant="finePrint">
                    {formatRelativeDate(entry.createdAt)}
                  </MUITypography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
