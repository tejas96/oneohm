'use client';

import { Chip, type ChipProps } from '@mui/material';
import type { JSX } from 'react';

import { pickDeterministic } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/** MUI color palette values supported as chip colors. */
export type StatusChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';

export type StatusChipVariant = 'filled' | 'outlined';

export interface MUIStatusChipProps extends Omit<ChipProps, 'color' | 'variant'> {
  /**
   * Explicit MUI palette color. When omitted and `autoColor` is true,
   * a deterministic color is chosen based on the `colorSeed` (or `label` if
   * `colorSeed` is not provided).
   */
  color?: StatusChipColor;
  /** Chip display variant. Defaults to 'outlined'. */
  variant?: StatusChipVariant;
  /**
   * Seed string used for deterministic color selection.
   * Pass the raw enum value here (e.g. `"residential_apartment"`) so the
   * hash is computed on the stable underlying value, not the formatted label.
   * When omitted, `label` is used as the seed.
   *
   * @example
   * <MUIStatusChip label={toTitleLabel(propertyType)} colorSeed={propertyType} />
   */
  colorSeed?: string;
  /**
   * When true (default), assigns a stable deterministic color from the
   * color pool based on the `colorSeed` (or `label`). Ignored when `color`
   * is provided explicitly.
   */
  autoColor?: boolean;
}

// ============================================================================
// Internals
// ============================================================================

/**
 * All semantic palette colors except 'default' and 'error'.
 * 'error' is reserved for explicitly dangerous states (destructive actions).
 * Pool has 5 entries — spread across enum values deterministically.
 */
const AUTO_COLOR_POOL: readonly StatusChipColor[] = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
];

// ============================================================================
// Component
// ============================================================================

/**
 * Reusable status chip built on MUI `Chip`.
 *
 * **Color resolution order:**
 * 1. `color` prop — explicit override, always wins.
 * 2. `autoColor={true}` (default) + `colorSeed` or `label` — stable hash-based color.
 * 3. `autoColor={false}` — neutral 'default' gray.
 *
 * **Best practice:** pass the raw enum value as `colorSeed` and the formatted
 * display string as `label`. This ensures the same enum value always maps to the
 * same color even if the display label changes.
 *
 * @example
 * // Auto-color seeded from raw enum (recommended)
 * <MUIStatusChip label={toTitleLabel(status)} colorSeed={status} />
 *
 * @example
 * // Explicit semantic color
 * <MUIStatusChip label="Active" color="success" />
 *
 * @example
 * // Neutral gray (no auto-color)
 * <MUIStatusChip label="Unknown" autoColor={false} />
 *
 * @example
 * // Filled danger state
 * <MUIStatusChip label="Lost" color="error" variant="filled" />
 */
export function MUIStatusChip({
  label,
  color,
  colorSeed,
  variant = 'outlined',
  autoColor = true,
  size = 'small',
  ...rest
}: MUIStatusChipProps): JSX.Element {
  const seed = colorSeed ?? (typeof label === 'string' ? label : '');

  const resolvedColor: StatusChipColor =
    color ??
    (autoColor && seed
      ? (pickDeterministic(seed, AUTO_COLOR_POOL, 'default') as StatusChipColor)
      : 'default');

  return <Chip label={label} color={resolvedColor} variant={variant} size={size} {...rest} />;
}
