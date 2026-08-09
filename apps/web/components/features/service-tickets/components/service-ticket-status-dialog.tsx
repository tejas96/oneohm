'use client';

import { Alert, Button, Stack } from '@mui/material';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import { type JSX, useEffect, useMemo, useState } from 'react';

import { SERVICE_TICKET_STATUS_LABELS } from '../constants';
import { useServiceTicketMutations, type ServiceTicketDetail } from '../hooks/use-service-tickets';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { MUIInput } from '@/components/ui/mui-input';
import { MUISelect } from '@/components/ui/mui-select';

export interface ServiceTicketStatusDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: ServiceTicketDetail;
}

export function ServiceTicketStatusDialog({
  open,
  onClose,
  ticket,
}: ServiceTicketStatusDialogProps): JSX.Element {
  const { updateStatus } = useServiceTicketMutations();

  const [status, setStatus] = useState<ServiceTicketStatus | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setStatus('');
    setNote('');
    setError(undefined);
  }, [open]);

  /** Only the statuses the ticket is not already in. */
  const options = useMemo(
    () =>
      Object.values(ServiceTicketStatus)
        .filter((candidate) => candidate !== ticket.status)
        .map((candidate) => ({
          value: candidate,
          label: SERVICE_TICKET_STATUS_LABELS[candidate],
        })),
    [ticket.status],
  );

  const requiresNote = status === ServiceTicketStatus.RESOLVED;
  const isClosing = status === ServiceTicketStatus.CLOSED;

  const handleSubmit = async (): Promise<void> => {
    if (!status) {
      setError('Choose a status');
      return;
    }
    if (requiresNote && !note.trim()) {
      setError('A resolution note is required when resolving a ticket.');
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: ticket.id,
        status,
        note: note.trim() || undefined,
      });
      onClose();
    } catch {
      // Toast carries the message; keep the dialog open so the note survives.
    }
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="sm">
      <MUIDialogHeader>
        <MUIDialogTitle>Change status</MUIDialogTitle>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Stack spacing={2}>
          <MUISelect
            fieldLabel="New status"
            required
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ServiceTicketStatus);
              setError(undefined);
            }}
            options={options}
            placeholder="Select a status"
            error={!status ? error : undefined}
            fullWidth
          />

          <MUIInput
            fieldLabel={requiresNote ? 'Resolution note' : 'Note'}
            required={requiresNote}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setError(undefined);
            }}
            placeholder={
              requiresNote ? 'What fixed it?' : 'Optional — recorded against this change'
            }
            error={status ? error : undefined}
            multiline
            minRows={2}
            fullWidth
          />

          {isClosing && (
            <Alert severity="warning">
              Closing is final — this ticket cannot be reopened or edited afterwards.
            </Alert>
          )}
        </Stack>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={updateStatus.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={updateStatus.isPending}
        >
          Update status
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
