'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useEffect, useState, type JSX } from 'react';

import { useMarkPropertyLost } from '@/components/features/followups';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';
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
 * Built on the house MUIDialog kit rather than raw MUI primitives: the theme
 * zeroes `MuiDialogTitle` padding on purpose so this kit can own the spacing,
 * so a hand-rolled `<DialogTitle>` renders flush against the dialog edge.
 */
export function MarkAsLostDialog({
  open,
  onClose,
  propertyId,
  propertyName,
}: MarkAsLostDialogProps): JSX.Element {
  const save = useGatedAction('properties.edit', () => handleSubmit(), 'Mark as lost');
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
    <MUIDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !markLost.isPending) onClose();
      }}
      size="sm"
      disableEscapeKeyDown={markLost.isPending}
    >
      <MUIDialogHeader hideCloseButton={markLost.isPending}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'error.light',
              flexShrink: 0,
            }}
          >
            <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <MUIDialogTitle>Mark site as lost</MUIDialogTitle>
            <MUIDialogDescription>
              Cancels this site&apos;s pending follow-ups. Other sites for this customer are
              unaffected.
            </MUIDialogDescription>
          </Box>
        </Box>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Closing <strong>{propertyName || 'this site'}</strong>.
        </Typography>
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
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={markLost.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          disabled={!reason.trim() || markLost.isPending}
        >
          {markLost.isPending ? 'Marking…' : 'Mark lost'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
