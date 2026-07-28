'use client';

import { Box } from '@mui/material';
import * as React from 'react';

import { color, radius, shadow } from '@/lib/theme/tokens';

export interface OptionCardProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Bold primary label. */
  label: string;
  /** Muted supporting line under the label. */
  meta?: string;
  /** Rendered before the label — a radio, a colour dot, etc. */
  leading?: React.ReactNode;
  /** Stacks `leading` above the text instead of beside it. */
  layout?: 'inline' | 'stacked';
}

/**
 * Selectable card used for radio-style choices (connection type, lead
 * temperature). Selection reads as an `accent-subtle` fill plus an inset
 * accent ring — the DS's substitute for a border.
 */
export function OptionCard({
  active = false,
  disabled = false,
  onClick,
  label,
  meta,
  leading,
  layout = 'inline',
}: OptionCardProps): React.JSX.Element {
  const isStacked = layout === 'stacked';

  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      sx={{
        textAlign: 'left',
        width: '100%',
        border: 'none',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: isStacked ? 'column' : 'row',
        alignItems: isStacked ? 'stretch' : 'center',
        gap: isStacked ? '5px' : '11px',
        p: '13px 15px',
        borderRadius: radius['rf-lg'],
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: active ? color['accent-subtle'] : color['surface-alt'],
        boxShadow: active ? `inset 0 0 0 1.5px ${color.accent}` : shadow.e1,
        transition: 'background 160ms ease, box-shadow 160ms ease',
        '&:hover': disabled
          ? {}
          : { boxShadow: active ? `inset 0 0 0 1.5px ${color.accent}` : shadow.e2 },
      }}
    >
      {isStacked ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {leading}
          <Box sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</Box>
        </Box>
      ) : (
        <>
          {leading}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</Box>
            {meta && <Box sx={{ fontSize: 12, color: color['text-tertiary'] }}>{meta}</Box>}
          </Box>
        </>
      )}
      {isStacked && meta && <Box sx={{ fontSize: 12, color: color['text-secondary'] }}>{meta}</Box>}
    </Box>
  );
}
