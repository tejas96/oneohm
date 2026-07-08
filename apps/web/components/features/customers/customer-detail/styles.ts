import { type SxProps, type Theme, alpha } from '@mui/material/styles';

/** Sticky offset that sits below the 48px global app header (z-50). */
export const stickyBelowAppHeaderSx: SxProps<Theme> = {
  position: 'sticky',
  top: 'var(--header-height, 48px)',
  zIndex: 10,
};

export const stickyHeaderPaperSx: SxProps<Theme> = (theme) => ({
  position: 'sticky',
  top: 'var(--header-height, 48px)',
  zIndex: 10,
  mb: 2,
  p: 2,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: 'blur(8px)',
});

export const customerAvatarSx: SxProps<Theme> = {
  width: 48,
  height: 48,
  bgcolor: 'primary.main',
  color: 'common.white',
  fontWeight: 600,
  fontSize: '0.875rem',
};

export const pipelineStepChipSx = {
  done: {
    bgcolor: 'success.main',
    color: 'common.white',
    borderColor: 'success.main',
    '& .MuiChip-label': { color: 'inherit', fontWeight: 500 },
  },
  current: {
    bgcolor: 'warning.main',
    color: 'common.white',
    borderColor: 'warning.main',
    '& .MuiChip-label': { color: 'inherit', fontWeight: 500 },
  },
  pending: {
    bgcolor: 'grey.100',
    color: 'text.secondary',
    borderColor: 'divider',
    '& .MuiChip-label': { color: 'inherit' },
  },
} as const;
