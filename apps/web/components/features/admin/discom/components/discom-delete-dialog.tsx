'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { type JSX } from 'react';

import type { DiscomAdmin } from '../hooks/use-discoms-admin';
import { buildDiscomPreviewLabel } from '../utils/discom-display.util';

import { color } from '@/lib/theme/tokens';

interface DiscomDeleteDialogProps {
  open: boolean;
  discom: DiscomAdmin | null;
  isPending?: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  onDeactivateInstead: () => void;
}

export function DiscomDeleteDialog({
  open,
  discom,
  isPending = false,
  onClose,
  onConfirmDelete,
  onDeactivateInstead,
}: DiscomDeleteDialogProps): JSX.Element {
  const blocked = (discom?.linkedPropertiesCount ?? 0) > 0;
  const label = discom ? buildDiscomPreviewLabel(discom) || discom.divisionName : '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 452,
          borderRadius: '32px',
          p: 0.5,
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(255,255,255,0.42)',
            backdropFilter: 'blur(8px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: 18,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {blocked ? (
          <InfoOutlinedIcon sx={{ color: color.info, fontSize: 22 }} />
        ) : (
          <DeleteOutlineIcon sx={{ color: color.danger, fontSize: 22 }} />
        )}
        {blocked ? 'This DISCOM is in use' : 'Delete this DISCOM?'}
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            fontSize: 13,
            color: color['text-secondary'],
            lineHeight: 1.55,
            textWrap: 'pretty',
          }}
        >
          {blocked ? (
            <>
              {label} is mapped to {discom?.linkedPropertiesCount}{' '}
              {discom?.linkedPropertiesCount === 1 ? 'active site' : 'active sites'}. Deactivate it
              instead — existing sites keep their record and reps stop seeing it on new surveys.
            </>
          ) : (
            <>
              {label} will be removed from the DISCOM picker. No sites are mapped to it, so nothing
              else changes.
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onClose} disabled={isPending}>
          Keep it
        </Button>
        {blocked ? (
          <Button variant="contained" onClick={onDeactivateInstead} disabled={isPending}>
            Deactivate instead
          </Button>
        ) : (
          <Button color="error" variant="contained" onClick={onConfirmDelete} disabled={isPending}>
            Delete DISCOM
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
