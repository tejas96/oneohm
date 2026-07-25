'use client';

import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import type { JSX } from 'react';

import type { CrmBulkAction } from './types';

import { color, crm, radius, shadow } from '@/lib/theme/tokens';

interface CrmSelectionBarProps<TRow> {
  selectedRows: TRow[];
  label: string;
  actions: CrmBulkAction<TRow>[];
  onClear: () => void;
}

/**
 * Floating bulk-action bar: a pill that lifts off the grid on `e5` (the modal
 * step) and sits just above the pager.
 *
 * It is absolutely positioned inside the table card rather than docked as a row,
 * so selecting rows never re-flows the grid underneath the cursor — the pointer
 * stays over the checkbox the user just clicked.
 */
export function CrmSelectionBar<TRow>({
  selectedRows,
  label,
  actions,
  onClear,
}: CrmSelectionBarProps<TRow>): JSX.Element {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: '50%',
        bottom: crm['selection-bar-offset'],
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        backgroundColor: color.surface,
        borderRadius: radius.pill,
        boxShadow: shadow.e5,
        padding: crm['selection-bar-pad'],
        zIndex: 12,
        animation: 'crmFadeUp var(--dur-standard) var(--ease-enter)',
        '@keyframes crmFadeUp': {
          from: { opacity: 0, transform: 'translate(-50%, 6px)' },
          to: { opacity: 1, transform: 'translate(-50%, 0)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box
        component="span"
        sx={{ fontSize: crm['text-row'], fontWeight: 500, whiteSpace: 'nowrap' }}
      >
        {label}
      </Box>

      {actions.map((action) => {
        const button = (
          <span>
            {/* span keeps the Tooltip working on a disabled button */}
            <Button
              size="small"
              variant={action.variant === 'primary' ? 'contained' : 'outlined'}
              disabled={action.disabled}
              onClick={() => action.onClick(selectedRows)}
            >
              {action.label}
            </Button>
          </span>
        );

        return action.disabled && action.disabledTooltip ? (
          <Tooltip key={action.label} title={action.disabledTooltip}>
            {button}
          </Tooltip>
        ) : (
          <Box key={action.label} sx={{ display: 'inline-flex' }}>
            {button}
          </Box>
        );
      })}

      <IconButton
        onClick={onClear}
        aria-label="Clear selection"
        sx={{
          width: crm['footer-button-size'],
          height: crm['footer-button-size'],
          color: color['text-secondary'],
        }}
      >
        <CloseIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
}
