'use client';

import { Box } from '@mui/material';
import * as React from 'react';

import { color, radius, shadow } from '@/lib/theme/tokens';

export interface SelectableChipProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * Pill-shaped selectable chip.
 *
 * Follows the DS rule that hierarchy comes from luminance and softness rather
 * than lines: unselected chips are a raised surface on `e1`, selected chips
 * fill with `accent-subtle` and gain an inset accent ring.
 */
export function SelectableChip({
  active = false,
  disabled = false,
  onClick,
  children,
}: SelectableChipProps): React.JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 28,
        px: 1.5,
        border: 'none',
        borderRadius: radius.pill,
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: '-0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        color: active ? color['accent-ink'] : color['text-secondary'],
        background: active ? color['accent-subtle'] : color['surface-alt'],
        boxShadow: active ? `inset 0 0 0 1.5px ${color.accent}` : shadow.e1,
        transition: 'background 160ms ease, box-shadow 160ms ease, color 160ms ease',
        '&:hover': disabled
          ? {}
          : { boxShadow: active ? `inset 0 0 0 1.5px ${color.accent}` : shadow.e2 },
      }}
    >
      {children}
    </Box>
  );
}
