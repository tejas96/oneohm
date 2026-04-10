'use client';

import { Avatar, type AvatarProps } from '@mui/material';
import { type JSX } from 'react';

import { getMuiAvatarColors } from '@/lib/utils/color';
import { getInitials } from '@/lib/utils/format';

// ============================================================================
// Constants — canonical sizes used across the app
// ============================================================================

/**
 * Predefined named avatar sizes.
 * Using a named size is preferred over a raw `size` number — it keeps all
 * avatars on the same scale system as defined in the MUI theme.
 *
 * | name   | px |
 * |--------|----|
 * | xs     | 20 |
 * | sm     | 24 |
 * | md     | 32 | ← default
 * | lg     | 40 |
 * | xl     | 48 |
 */
export const AVATAR_SIZES = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

// Font size is ~35% of the avatar diameter so initials never clip
function avatarFontSize(px: number): string {
  return `${(px * 0.35).toFixed(0)}px`;
}

// ============================================================================
// Types
// ============================================================================

export interface MUIAvatarProps extends Omit<AvatarProps, 'children'> {
  /**
   * Full name used to derive initials and pick a deterministic color.
   * Same name always produces the same color — no external color management needed.
   */
  name: string;
  /**
   * Named size token or explicit pixel diameter.
   * @default 'md' (32px)
   */
  size?: AvatarSize | number;
  /**
   * Override the auto-derived initials (e.g. when you want a single letter).
   */
  initials?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * MUI Avatar with built-in deterministic coloring, initials derivation, and
 * a consistent size system aligned to the MUI theme.
 *
 * Usage:
 * ```tsx
 * <MUIAvatar name="Tejas Patil" />               // 32 px, auto-color
 * <MUIAvatar name="Tejas Patil" size="sm" />     // 24 px
 * <MUIAvatar name="Tejas Patil" size={28} />     // custom 28 px
 * ```
 *
 * - Same name → same color on every render across the whole app
 * - No color imports, no `getMuiAvatarColors`, no `getInitials` at call sites
 * - Fully compatible with all MUI Avatar props (src, onClick, etc.)
 * - Caller `sx` is merged last so any override still works
 */
export function MUIAvatar({
  name,
  size = 'md',
  initials,
  sx,
  ...rest
}: MUIAvatarProps): JSX.Element {
  const letters = initials ?? getInitials(name);
  const colors = getMuiAvatarColors(name);
  const px = typeof size === 'number' ? size : AVATAR_SIZES[size];

  return (
    <Avatar
      sx={{
        ...colors,
        width: px,
        height: px,
        fontSize: avatarFontSize(px),
        // Caller overrides applied last so explicit sx always wins
        ...sx,
      }}
      {...rest}
    >
      {letters}
    </Avatar>
  );
}
