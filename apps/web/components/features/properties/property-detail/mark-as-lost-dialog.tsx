'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useEffect, useState, type JSX } from 'react';

import { useMarkPropertyLost } from '@/components/features/followups';
import { showToast } from '@/components/ui';
import { getErrorMessage } from '@/lib/utils';

interface MarkAsLostDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
}

/**
 * Close a site as lost, with the reason captured at the moment someone knows
 * it rather than reconstructed later.
 *
 * The reason is required: "lost" without a why is a row nobody can learn from.
 */
export function MarkAsLostDialog({
  open,
  onClose,
  propertyId,
  propertyName,
}: MarkAsLostDialogProps): JSX.Element {
  const [reason, setReason] = useState('');
  const markLost = useMarkPropertyLost();

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleSubmit = (): void => {
    markLost.mutate(
      { propertyId, reason: reason.trim() },
      {
        onSuccess: () => {
          showToast.success('Marked as lost — follow-ups closed');
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mark site as lost</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Closes <strong>{propertyName || 'this site'}</strong> and cancels its pending follow-ups.
          Other sites for this customer are unaffected.
        </DialogContentText>
        <TextField
          fullWidth
          size="small"
          label="Reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. competitor pricing, timeline, budget cut"
          helperText="Recorded against the site, so the loss can be counted later."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={markLost.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={!reason.trim() || markLost.isPending}
        >
          Mark lost
        </Button>
      </DialogActions>
    </Dialog>
  );
}
