'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { FollowupStatus } from '@tejas96/shared/types';
import { useState, type JSX } from 'react';

import { type FollowupResponse } from '../hooks/use-followups';

import { GatedMenuItem } from '@/components/shared/guards';
import { useGatedAction } from '@/lib/rbac';

export interface FollowupRowActionsProps {
  followup: FollowupResponse;
  onViewDetails: (followup: FollowupResponse) => void;
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
  onViewDetails,
  onComplete,
  onReschedule,
  onReassign,
  onCancel,
}: FollowupRowActionsProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const complete = useGatedAction(
    'followups.manage',
    () => onComplete(followup),
    'Complete follow-up',
  );
  const isPending = followup.status === FollowupStatus.PENDING;
  const close = (): void => setAnchor(null);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="flex-end"
      alignItems="center"
      flexShrink={0}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        size="small"
        startIcon={<CheckCircleOutlineIcon />}
        onClick={complete.onGatedClick}
        aria-disabled={!complete.allowed}
        sx={{
          flexShrink: 0,
          visibility: isPending ? 'visible' : 'hidden',
        }}
        aria-hidden={!isPending}
        tabIndex={isPending ? undefined : -1}
      >
        Complete
      </Button>

      <IconButton
        size="small"
        aria-label="More actions"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ flexShrink: 0 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          onClick={() => {
            onViewDetails(followup);
            close();
          }}
        >
          View details
        </MenuItem>
        <GatedMenuItem
          permission="followups.manage"
          subject="Reschedule follow-up"
          disabled={!isPending}
          onAction={() => {
            onReschedule(followup);
            close();
          }}
        >
          Reschedule
        </GatedMenuItem>
        <GatedMenuItem
          permission="followups.manage"
          subject="Reassign follow-up"
          onAction={() => {
            onReassign(followup);
            close();
          }}
        >
          Reassign
        </GatedMenuItem>
        <GatedMenuItem
          permission="followups.manage"
          subject="Cancel follow-up"
          disabled={!isPending}
          onAction={() => {
            onCancel(followup);
            close();
          }}
        >
          Cancel
        </GatedMenuItem>
      </Menu>
    </Stack>
  );
}
