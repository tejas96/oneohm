'use client';

import { Typography } from '@mui/material';
import type { SxProps, Theme, TypographyProps } from '@mui/material';
import * as React from 'react';

import {
  MUI_CAPTION_FONT_SIZE,
  MUI_DRAWER_TITLE_FONT_SIZE,
  MUI_FINE_PRINT_FONT_SIZE,
  MUI_LABEL_FONT_SIZE,
} from '@/lib/theme/mui-theme';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Semantic text variants for the app's design system.
 * Maps to recurring typography patterns found across components.
 *
 * All MUI TypographyProps pass through unchanged (noWrap, align, color,
 * component, sx, gutterBottom, classes, children, etc.) — only MUI's own
 * `variant` prop is replaced by this semantic token union.
 */
export type MUITypographyVariant =
  | 'sectionTitle'   // 0.875rem / 600 / text.primary  — section headings (Description, Activity, Checklist)
  | 'body'           // 0.875rem / text.secondary       — body copy, alert paragraphs, activity labels
  | 'bodyPrimary'    // 0.875rem / text.primary         — comment text, strong body copy
  | 'metaLabel'      // 0.6875rem / 600 / uppercase     — sidebar field labels (STATUS, PRIORITY, etc.)
  | 'timestamp'      // 0.75rem / text.disabled         — absolute formatted dates
  | 'finePrint'      // 0.6875rem / text.disabled       — relative activity timestamps
  | 'alertTitle'     // 0.75rem / 600 — no color (pass via sx or color prop)
  | 'placeholder'    // 0.875rem / text.disabled / italic — empty/unset field copy
  | 'drawerTitle'    // 1.25rem / 500 / text.primary    — page-level drawer heading
  | 'inherit';       // fontSize: inherit — used inside parents that control the font size (Button, Breadcrumbs)

/**
 * MUITypographyProps extends MUI's TypographyProps with one change:
 * the `variant` prop is replaced by our semantic token union instead of
 * MUI's heading/body variants (h1, body1, caption, etc.).
 *
 * All other MUI props pass through:
 * - `noWrap`       — truncates overflowing text with ellipsis
 * - `align`        — text-align ('left' | 'center' | 'right' | 'justify' | 'inherit')
 * - `color`        — palette token string ('error', 'text.secondary', etc.)
 * - `component`    — override the rendered HTML element (span, p, h2, label, div, etc.)
 * - `gutterBottom` — adds bottom margin
 * - `sx`           — style overrides; always merged on top of the variant base styles
 * - `classes`, `children`, `variantMapping` — pass through untouched
 */
export type MUITypographyProps = Omit<TypographyProps, 'variant'> & {
  variant?: MUITypographyVariant;
};

/* -------------------------------------------------------------------------- */
/*  Internals                                                                  */
/* -------------------------------------------------------------------------- */

/** Default HTML element for variants that differ from MUI's default (`p`). */
const DEFAULT_COMPONENT: Partial<Record<MUITypographyVariant, React.ElementType>> = {
  metaLabel: 'label',
  drawerTitle: 'h1',
};

/** Base sx for each semantic variant — uses theme constants, no hardcoded strings. */
const VARIANT_SX_MAP: Record<MUITypographyVariant, SxProps<Theme>> = {
  sectionTitle: {
    fontSize: MUI_LABEL_FONT_SIZE,
    fontWeight: 600,
    color: 'text.primary',
  },
  body: {
    fontSize: MUI_LABEL_FONT_SIZE,
    color: 'text.secondary',
  },
  bodyPrimary: {
    fontSize: MUI_LABEL_FONT_SIZE,
    color: 'text.primary',
  },
  metaLabel: {
    fontSize: MUI_FINE_PRINT_FONT_SIZE,
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    display: 'block',
  },
  timestamp: {
    fontSize: MUI_CAPTION_FONT_SIZE,
    color: 'text.disabled',
  },
  finePrint: {
    fontSize: MUI_FINE_PRINT_FONT_SIZE,
    color: 'text.disabled',
    mt: 0.5,
  },
  alertTitle: {
    fontSize: MUI_CAPTION_FONT_SIZE,
    fontWeight: 600,
    mb: 0.5,
  },
  placeholder: {
    fontSize: MUI_LABEL_FONT_SIZE,
    color: 'text.disabled',
    fontStyle: 'italic',
  },
  drawerTitle: {
    fontSize: MUI_DRAWER_TITLE_FONT_SIZE,
    fontWeight: 500,
    color: 'text.primary',
  },
  inherit: {
    fontSize: 'inherit',
  },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * App-level typography wrapper. Use `variant` to apply a semantic text style.
 * Any MUI TypographyProps (noWrap, align, color, component, sx, gutterBottom…)
 * can be passed and will be forwarded to the underlying MUI Typography.
 *
 * Caller `sx` always wins over the variant base styles.
 *
 * @example
 * // Section heading
 * <MUITypography variant="sectionTitle">Description</MUITypography>
 *
 * @example
 * // Inline body text (span)
 * <MUITypography variant="body" component="span">from</MUITypography>
 *
 * @example
 * // Long text that truncates with ellipsis
 * <MUITypography variant="body" noWrap>Very long string…</MUITypography>
 *
 * @example
 * // Alert title with semantic color override via sx
 * <MUITypography variant="alertTitle" sx={{ color: 'error.main' }}>Blocked</MUITypography>
 *
 * @example
 * // Plain MUI Typography (no variant) — sx only
 * <MUITypography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Custom</MUITypography>
 *
 * @example
 * // Inherit parent font size (inside Button, Breadcrumbs, etc.)
 * <MUITypography variant="inherit" component="span" noWrap>Label text</MUITypography>
 */
export function MUITypography({
  variant,
  component,
  sx,
  ...rest
}: MUITypographyProps): React.JSX.Element {
  const variantSx: SxProps<Theme> = variant ? VARIANT_SX_MAP[variant] : {};
  const resolvedComponent = component ?? (variant ? DEFAULT_COMPONENT[variant] : undefined);
  const mergedSx = [variantSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])];

  return resolvedComponent ? (
    <Typography
      component={resolvedComponent}
      sx={mergedSx}
      {...rest}
    />
  ) : (
    <Typography
      sx={mergedSx}
      {...rest}
    />
  );
}
