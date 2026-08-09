'use client';

import { Button } from '@mui/material';
import { useEffect, useState, type JSX } from 'react';

import { useReassignFollowupsBulk } from '../hooks';
import { type FollowupResponse } from '../hooks/use-followups';

import { useEmployees } from '@/components/features/employees';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { getErrorMessage } from '@/lib/utils';

interface FollowupReassignDialogProps {
  /** Followups to move; empty closes the dialog. Handles one or many. */
  followups: FollowupResponse[];
  onClose: () => void;
}

/**
 * Move follow-ups to a different owner.
 *
 * Ownership of a lead IS the assignee of its pending follow-up, so this moves
 * the lead too. Deliberately unrestricted — no RBAC in this feature.
 */
export function FollowupReassignDialog({
  followups,
  onClose,
}: FollowupReassignDialogProps): JSX.Element {
  const open = followups.length > 0;
  const [assignee, setAssignee] = useState<string | null>(null);
  const { data: employees = [] } = useEmployees({ enabled: open });
  const reassign = useReassignFollowupsBulk();

  useEffect(() => {
    if (open) setAssignee(null);
  }, [open]);

  const handleSubmit = (): void => {
    if (!assignee) return;
    reassign.mutate(
      { ids: followups.map((f) => f.id), assignedToUserId: assignee },
      {
        onSuccess: (result) => {
          showToast.success(`Moved ${result.updated} follow-up(s)`);
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <MUIDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !reassign.isPending) onClose();
      }}
      size="sm"
    >
      <MUIDialogHeader hideCloseButton={reassign.isPending}>
        <MUIDialogTitle>
          {`Reassign ${followups.length} follow-up${followups.length === 1 ? '' : 's'}`}
        </MUIDialogTitle>
        <MUIDialogDescription>
          Ownership of a lead is whoever holds its next follow-up, so this moves the lead too.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <MUIUserAssigneeSelector
          fieldLabel="New owner"
          required
          value={assignee}
          onChange={setAssignee}
          employees={employees}
          disablePortal
        />
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={reassign.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!assignee || reassign.isPending}
        >
          {reassign.isPending ? 'Moving…' : 'Reassign'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
