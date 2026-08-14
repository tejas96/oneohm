'use client';

import { Button } from '@mui/material';
import { useEffect, useState, type JSX } from 'react';

import { useRescheduleFollowup } from '../hooks';
import { type FollowupResponse } from '../hooks/use-followups';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';

interface FollowupRescheduleDialogProps {
  /** The followup to move; null closes the dialog. */
  followup: FollowupResponse | null;
  onClose: () => void;
}

/**
 * Move a followup's date without completing it.
 *
 * The escape valve that stops people cancelling follow-ups just to clear them
 * off today's list — "he asked me to call Monday instead" is a date change, not
 * an outcome.
 */
export function FollowupRescheduleDialog({
  followup,
  onClose,
}: FollowupRescheduleDialogProps): JSX.Element {
  const save = useGatedAction('followups.manage', () => handleSubmit(), 'Reschedule follow-up');
  const [date, setDate] = useState<Date | null>(null);
  const reschedule = useRescheduleFollowup();

  useEffect(() => {
    if (followup) setDate(new Date(followup.scheduledAt));
  }, [followup]);

  const handleSubmit = (): void => {
    if (!followup || !date) return;
    reschedule.mutate(
      { id: followup.id, scheduledAt: date.toISOString() },
      {
        onSuccess: () => {
          showToast.success('Follow-up moved');
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <MUIDialog
      open={Boolean(followup)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !reschedule.isPending) onClose();
      }}
      size="sm"
    >
      <MUIDialogHeader hideCloseButton={reschedule.isPending}>
        <MUIDialogTitle>Reschedule follow-up</MUIDialogTitle>
        <MUIDialogDescription>
          Moves the date without completing it — no outcome recorded.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <MUIDatePicker fieldLabel="New date" required value={date} onChange={setDate} fullWidth />
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={reschedule.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          disabled={!date || reschedule.isPending}
        >
          {reschedule.isPending ? 'Moving…' : 'Move'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
