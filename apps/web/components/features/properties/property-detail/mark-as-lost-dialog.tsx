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
import { useState, type JSX } from 'react';

interface MarkAsLostDialogProps {
  open: boolean;
  onClose: () => void;
  propertyName?: string;
}

export function MarkAsLostDialog({
  open,
  onClose,
  propertyName,
}: MarkAsLostDialogProps): JSX.Element {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mark Property as Lost</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          This action is not wired yet. Capture context for{' '}
          <strong>{propertyName || 'this property'}</strong> and close the dialog.
        </DialogContentText>
        <TextField
          fullWidth
          size="small"
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. pricing, competitor, timeline"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onClose} disabled={!reason.trim()}>
          Save (stub)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
