'use client';

import { Box } from '@mui/material';
import type { JSX } from 'react';

import type { CrmTone } from './types';

import { color, crm, radius } from '@/lib/theme/tokens';

/**
 * Readable foreground + wash background per tone.
 *
 * The DS splits every semantic colour into a readable foreground (bare name)
 * and a vivid fill (`-main`). A pill takes the readable one for both its label
 * and its dot, on the matching `-bg` wash — that is what keeps an 11px label
 * legible where the vivid fill would not be.
 */
const TONE_PALETTE: Record<CrmTone, { ink: string; bg: string }> = {
  neutral: { ink: color.neutral, bg: color['neutral-bg'] },
  accent: { ink: color['accent-ink'], bg: color['accent-subtle'] },
  success: { ink: color.success, bg: color['success-bg'] },
  info: { ink: color.info, bg: color['info-bg'] },
  warning: { ink: color.warning, bg: color['warning-bg'] },
  danger: { ink: color.danger, bg: color['danger-bg'] },
};

/** Vivid fills, for bars and other non-text marks where contrast is not at stake. */
export const CRM_TONE_FILL: Record<CrmTone, string> = {
  neutral: color['neutral-400'],
  accent: color.accent,
  success: color['success-main'],
  info: color['info-main'],
  warning: color['warning-main'],
  danger: color.danger,
};

export type CrmPillSize = 'md' | 'sm' | 'xs';

const SIZE_METRICS: Record<CrmPillSize, { height: string; px: number; fontSize: string }> = {
  /** Customer-row status. */
  md: { height: crm['status-pill-height'], px: 1.25, fontSize: crm['text-row-sm'] },
  /** Site quote status. */
  sm: { height: crm['sites-quote-pill-height'], px: 1.125, fontSize: crm['text-row-xs'] },
  /** Site status. */
  xs: { height: crm['sites-status-pill-height'], px: 1.125, fontSize: crm['text-row-xs'] },
};

interface CrmStatusPillProps {
  label: string;
  tone: CrmTone;
  /** Leading tone-coloured dot. */
  dot?: boolean;
  size?: CrmPillSize;
}

/**
 * The pill used for every status-like value in the CRM grid.
 *
 * Deliberately not `MUIStatusChip`: that component hashes a seed into one of
 * five palette colours, which is right for open-ended enums like lead source
 * but wrong here — customer and site status are a fixed, meaningful ladder
 * (lead → prospect → active, or active → converted / on-hold / lost) and must
 * map to the semantic colour that ladder implies, not to a hash.
 */
export function CrmStatusPill({
  label,
  tone,
  dot = true,
  size = 'md',
}: CrmStatusPillProps): JSX.Element {
  const palette = TONE_PALETTE[tone];
  const metrics = SIZE_METRICS[size];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: metrics.height,
        px: metrics.px,
        borderRadius: radius.pill,
        backgroundColor: palette.bg,
        color: palette.ink,
        fontSize: metrics.fontSize,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {dot ? (
        <Box
          component="span"
          sx={{
            width: crm['status-dot-size'],
            height: crm['status-dot-size'],
            borderRadius: '50%',
            backgroundColor: palette.ink,
            flexShrink: 0,
          }}
        />
      ) : null}
      {label}
    </Box>
  );
}
