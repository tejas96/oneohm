'use client';

import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Drawer, IconButton } from '@mui/material';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

export interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  /** "Open Project / Customer / etc." deep-link button. */
  primaryAction?: { label: string; onClick: () => void };
  /** Width preset; outer drawer is wider so a stacked inner drawer reads as nested. */
  variant?: 'outer' | 'inner';
  children: React.ReactNode;
}

/**
 * Right-anchored drawer shared by every Finance drilldown
 * (project/customer/vendor). Standardises:
 *   - sticky header with title, subtitle, primary action, close button
 *   - 480px width for `inner` (project), 560px for `outer` (customer/vendor)
 *   - z-index bump for `inner` so it cleanly stacks on top of `outer`
 *     without trapping the outer's focus (per plan §self-review).
 *
 * Body is whatever the caller passes in — drawer content is
 * intentionally unopinionated about sections so each drawer can lay out
 * its own summary cards / lists.
 */
export function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  primaryAction,
  variant = 'outer',
  children,
}: DrawerShellProps): React.JSX.Element {
  const width = variant === 'inner' ? 480 : 560;
  const innerSx =
    variant === 'inner'
      ? {
          zIndex: (t: { zIndex: { modal: number } }) => t.zIndex.modal + 2,
        }
      : undefined;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      disableEnforceFocus={variant === 'inner'}
      sx={innerSx}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: width },
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <div className="min-w-0 flex-1">
          <MUITypography variant="drawerTitle" className="block truncate">
            {title}
          </MUITypography>
          {subtitle != null && (
            <MUITypography
              variant="body"
              className="text-foreground-secondary mt-0.5 block truncate"
            >
              {subtitle}
            </MUITypography>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {primaryAction && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon fontSize="small" />}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          <IconButton size="small" aria-label="Close" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>{children}</Box>
    </Drawer>
  );
}
