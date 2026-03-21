'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  type DialogProps,
  type SxProps,
  type Theme,
} from '@mui/material';
import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*  Size presets                                                               */
/* -------------------------------------------------------------------------- */

const SIZE_MAX_WIDTH: Record<string, number | string> = {
  sm: 400,
  default: 520,
  lg: 672,
  xl: 896,
  full: '90vw',
};

type DialogSize = 'sm' | 'default' | 'lg' | 'xl' | 'full';

/* -------------------------------------------------------------------------- */
/*  Context — shares onClose across sub-components                             */
/* -------------------------------------------------------------------------- */

const DialogCloseContext = React.createContext<(() => void) | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/*  MUIDialog                                                                  */
/* -------------------------------------------------------------------------- */

export interface MUIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogSize;
  children: React.ReactNode;
  /** Forward any native MUI Dialog prop */
  slotProps?: DialogProps['slotProps'];
  fullScreen?: boolean;
  disableEscapeKeyDown?: boolean;
  keepMounted?: boolean;
  /** Prevents focus trap from fighting with other focus-managing overlays (e.g. Radix Sheet) */
  disableEnforceFocus?: boolean;
  disableAutoFocus?: boolean;
  disableRestoreFocus?: boolean;
  sx?: SxProps<Theme>;
}

function MUIDialog({
  open,
  onOpenChange,
  size = 'default',
  children,
  sx,
  ...rest
}: MUIDialogProps): React.JSX.Element {
  const handleClose = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const paperSx = React.useMemo(
    () => ({
      maxWidth: SIZE_MAX_WIDTH[size],
      width: '100%',
      borderRadius: 2,
      border: 1,
      borderColor: 'divider',
      m: 2,
      maxHeight: 'calc(100vh - 32px)',
      ...((sx as Record<string, unknown>) ?? {}),
    }),
    [size, sx],
  );

  const paperProps = React.useMemo(() => ({ elevation: 24 as const, sx: paperSx }), [paperSx]);

  const mergedSlotProps = React.useMemo(
    () => ({
      backdrop: {
        sx: {
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        },
      },
      ...rest.slotProps,
    }),
    [rest.slotProps],
  );

  return (
    <DialogCloseContext.Provider value={handleClose}>
      <Dialog
        open={open}
        onClose={handleClose}
        scroll="paper"
        PaperProps={paperProps}
        slotProps={mergedSlotProps}
        fullScreen={rest.fullScreen}
        disableEscapeKeyDown={rest.disableEscapeKeyDown}
        keepMounted={rest.keepMounted}
        disableEnforceFocus={rest.disableEnforceFocus}
        disableAutoFocus={rest.disableAutoFocus}
        disableRestoreFocus={rest.disableRestoreFocus}
      >
        {children}
      </Dialog>
    </DialogCloseContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  MUIDialogHeader                                                            */
/* -------------------------------------------------------------------------- */

interface MUIDialogHeaderProps {
  children: React.ReactNode;
  hideCloseButton?: boolean;
  sx?: SxProps<Theme>;
}

function MUIDialogHeader({
  children,
  hideCloseButton,
  sx,
}: MUIDialogHeaderProps): React.JSX.Element {
  const onClose = React.useContext(DialogCloseContext);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        px: 3,
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        ...((sx as Record<string, unknown>) ?? {}),
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
        {children}
      </Box>
      {!hideCloseButton && onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          size="small"
          sx={{ mt: -0.5, mr: -1, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  MUIDialogTitle                                                             */
/* -------------------------------------------------------------------------- */

function MUIDialogTitleComp({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}): React.JSX.Element {
  return (
    <DialogTitle
      sx={{
        p: 0,
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
        ...((sx as Record<string, unknown>) ?? {}),
      }}
    >
      {children}
    </DialogTitle>
  );
}

/* -------------------------------------------------------------------------- */
/*  MUIDialogDescription                                                       */
/* -------------------------------------------------------------------------- */

function MUIDialogDescription({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}): React.JSX.Element {
  return (
    <Typography variant="body2" color="text.secondary" sx={sx}>
      {children}
    </Typography>
  );
}

/* -------------------------------------------------------------------------- */
/*  MUIDialogBody                                                              */
/* -------------------------------------------------------------------------- */

interface MUIDialogBodyProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  dividers?: boolean;
}

function MUIDialogBody({
  children,
  sx,
  dividers = false,
}: MUIDialogBodyProps): React.JSX.Element {
  return (
    <DialogContent
      dividers={dividers}
      sx={{
        px: 3,
        py: 3,
        ...((sx as Record<string, unknown>) ?? {}),
      }}
    >
      {children}
    </DialogContent>
  );
}

/* -------------------------------------------------------------------------- */
/*  MUIDialogFooter                                                            */
/* -------------------------------------------------------------------------- */

interface MUIDialogFooterProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

function MUIDialogFooter({
  children,
  sx,
}: MUIDialogFooterProps): React.JSX.Element {
  return (
    <DialogActions
      sx={{
        px: 3,
        py: 2,
        gap: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'grey.50',
        borderBottomLeftRadius: 'inherit',
        borderBottomRightRadius: 'inherit',
        ...((sx as Record<string, unknown>) ?? {}),
      }}
    >
      {children}
    </DialogActions>
  );
}

/* -------------------------------------------------------------------------- */
/*  Exports                                                                    */
/* -------------------------------------------------------------------------- */

export {
  MUIDialog,
  MUIDialogHeader,
  MUIDialogTitleComp as MUIDialogTitle,
  MUIDialogDescription,
  MUIDialogBody,
  MUIDialogFooter,
};
