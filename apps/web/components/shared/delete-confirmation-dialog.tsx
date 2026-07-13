'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, Typography } from '@mui/material';
import type { JSX } from 'react';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui';

export interface DeleteConfirmationDialogProps {
  open: boolean;
  title: string;
  itemName: string;
  isPending?: boolean;
  permanent?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  open,
  title,
  itemName,
  isPending = false,
  permanent = true,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps): JSX.Element {
  return (
    <MUIDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onCancel();
      }}
      size="sm"
      disableEscapeKeyDown={isPending}
    >
      <MUIDialogHeader hideCloseButton={isPending}>
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
            <MUIDialogTitle>{title}</MUIDialogTitle>
            <MUIDialogDescription>
              {permanent
                ? 'This will permanently delete this record and cannot be undone.'
                : 'This action cannot be undone.'}
            </MUIDialogDescription>
          </Box>
        </Box>
      </MUIDialogHeader>
      <MUIDialogBody>
        <Typography variant="body2">
          Are you sure you want to delete <strong>{itemName}</strong>?
        </Typography>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button variant="outlined" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
