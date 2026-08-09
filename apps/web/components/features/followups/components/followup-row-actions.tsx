'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { FollowupStatus } from '@tejas96/shared/types';
import { useState, type JSX } from 'react';

import { type FollowupResponse } from '../hooks/use-followups';

export interface FollowupRowActionsProps {
  followup: FollowupResponse;
  onComplete: (followup: FollowupResponse) => void;
  onReschedule: (followup: FollowupResponse) => void;
  onReassign: (followup: FollowupResponse) => void;
  onCancel: (followup: FollowupResponse) => void;
}

/**
 * The actions offered on a single follow-up row.
 *
 * Shared so every surface offers the same set. They had drifted: /followups had
 * four actions behind a menu while the detail tabs offered only Complete, so
 * you could see a lead needed rescheduling on the page where you were looking
 * at it and have nowhere to do it.
 *
 * The menu button renders on every row regardless of status — Reassign applies
 * to any follow-up, and a constant trailing control keeps row heights equal
 * instead of only action-bearing rows growing taller.
 */
export function FollowupRowActions({
  followup,
  onComplete,
  onReschedule,
  onReassign,
  onCancel,
}: FollowupRowActionsProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const isPending = followup.status === FollowupStatus.PENDING;
  const close = (): void => setAnchor(null);

  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
      <Button
        size="small"
        startIcon={<CheckCircleOutlineIcon />}
        onClick={() => onComplete(followup)}
        // Kept mounted rather than unmounted so every row is the same height.
        sx={{ visibility: isPending ? 'visible' : 'hidden' }}
        aria-hidden={!isPending}
        tabIndex={isPending ? undefined : -1}
      >
        Complete
      </Button>

      <IconButton
        size="small"
        aria-label="More actions"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          disabled={!isPending}
          onClick={() => {
            onReschedule(followup);
            close();
          }}
        >
          Reschedule
        </MenuItem>
        <MenuItem
          onClick={() => {
            onReassign(followup);
            close();
          }}
        >
          Reassign
        </MenuItem>
        <MenuItem
          disabled={!isPending}
          onClick={() => {
            onCancel(followup);
            close();
          }}
        >
          Cancel
        </MenuItem>
      </Menu>
    </Stack>
  );
}
