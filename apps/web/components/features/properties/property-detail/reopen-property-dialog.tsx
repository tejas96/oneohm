'use client';

import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { Box, Button, Typography } from '@mui/material';
import { type JSX } from 'react';

import { useReopenProperty } from '@/components/features/followups';
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

interface ReopenPropertyDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
}

/**
 * Undo a lost mark. The site returns to Active — its loss reason and note
 * are cleared server-side, not archived, so nothing that reads the property
 * afterwards can still show them.
 *
 * Shell modelled on mark-as-lost-dialog.tsx, its inverse.
 */
export function ReopenPropertyDialog({
  open,
  onClose,
  propertyId,
  propertyName,
}: ReopenPropertyDialogProps): JSX.Element {
  const reopenMutation = useReopenProperty();

  const handleSubmit = (): void => {
    reopenMutation.mutate(
      { propertyId },
      {
        onSuccess: () => {
          showToast.success('Site reopened');
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  const save = useGatedAction('properties.edit', handleSubmit, 'Reopen site');

  return (
    <MUIDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !reopenMutation.isPending) onClose();
      }}
      size="sm"
      disableEscapeKeyDown={reopenMutation.isPending}
    >
      <MUIDialogHeader hideCloseButton={reopenMutation.isPending}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'success.light',
              flexShrink: 0,
            }}
          >
            <RestartAltOutlinedIcon sx={{ color: 'success.main', fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <MUIDialogTitle>Reopen site</MUIDialogTitle>
            <MUIDialogDescription>
              Puts this site back in the active pipeline, ready to be quoted again.
            </MUIDialogDescription>
          </Box>
        </Box>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Typography variant="body2">
          Reopening <strong>{propertyName || 'this site'}</strong> clears its lost reason and
          returns its status to Active.
        </Typography>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={reopenMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          disabled={reopenMutation.isPending}
        >
          {reopenMutation.isPending ? 'Reopening…' : 'Reopen'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
