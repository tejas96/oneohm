import { X } from 'lucide-react';
import * as React from 'react';

import { cva, type VariantProps } from '@/lib/cva';
import { cn } from '@/lib/utils';

/**
 * Badge Component - OneOhm V2 Design System
 *
 * Variants (per UX badges.html):
 * - Status: default, secondary, success, warning, error, info, pending
 * - Temperature: hot (animated), warm, cold
 * - Style: outline, muted
 * - Special: count (for notification counts)
 *
 * Features:
 * - Removable badges with onRemove callback
 * - Dot indicator for minimal status display
 * - Pill shape (rounded-full) by default
 */
const badgeVariants = cva(
  // No `border` in the base: the DS conveys chip identity through a tinted
  // background, never an outline. Every variant below was already
  // `border-transparent` except `outline`/`muted`, which now use a tint too.
  'inline-flex items-center gap-1.5 w-fit font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-muted text-foreground-secondary',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        error: 'bg-error/15 text-error',
        destructive: 'bg-error/15 text-error',
        info: 'bg-info/15 text-info',
        pending: 'bg-warning/10 text-warning',
        outline: 'bg-muted text-foreground-secondary',
        muted: 'bg-muted text-foreground-tertiary',
        hot: 'bg-error text-error-foreground',
        warm: 'bg-warning text-warning-foreground',
        cold: 'bg-info text-info-foreground',
        count: 'bg-primary text-white',
        teal: 'bg-info/10 text-info',
        purple: 'bg-primary/10 text-primary',
        amber: 'bg-warning/10 text-warning',
        'green-subtle': 'bg-success/10 text-success',
        'red-subtle': 'bg-destructive/10 text-destructive',
        'blue-subtle': 'bg-primary/10 text-primary',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-section',
        sm: 'px-2 py-0.5 text-2xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-xs',
      },
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'pill',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a dot indicator before the text */
  dot?: boolean;
  /** Animate the dot (for "hot" leads) */
  dotAnimated?: boolean;
  /** Make the badge removable with a close button */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
}

function Badge({
  className,
  variant,
  size,
  shape,
  dot,
  dotAnimated,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps): React.ReactElement {
  const showDot = dot || variant === 'hot' || variant === 'warm' || variant === 'cold';
  const isAnimated = dotAnimated || variant === 'hot';

  return (
    <div className={cn(badgeVariants({ variant, size, shape }), className)} {...props}>
      {showDot && (
        <span
          className={cn(
            'size-1.5 rounded-full bg-current',
            isAnimated && 'animate-pulse',
            // Use white dot for solid color badges
            (variant === 'hot' || variant === 'warm' || variant === 'cold') && 'bg-white',
          )}
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 -mr-1 rounded-full p-0.5 opacity-60 hover:opacity-100 focus:outline-none cursor-pointer"
          aria-label="Remove"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

/**
 * DotBadge - Simple dot indicator with text
 * Used for online/offline status, etc.
 */
export interface DotBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color of the dot */
  color?: 'green' | 'gray' | 'amber' | 'red' | 'blue';
}

function DotBadge({
  className,
  color = 'green',
  children,
  ...props
}: DotBadgeProps): React.ReactElement {
  // Uses theme tokens for colors
  const dotColors = {
    green: 'bg-success',
    gray: 'bg-foreground-tertiary',
    amber: 'bg-warning',
    red: 'bg-error',
    blue: 'bg-info',
  };

  return (
    <span
      className={cn('inline-flex items-center gap-2 text-sm text-foreground', className)}
      {...props}
    >
      <span className={cn('size-radio-indicator-sm rounded-full', dotColors[color])} />
      {children}
    </span>
  );
}

/**
 * CountBadge - Numeric badge for notifications
 * Shows count with optional max value (e.g., "99+")
 *
 * Sizes:
 * - 2xs: 14px badge, 8px text - rail icons, very compact
 * - xs: 16px badge, 9px text - nav badges, compact
 * - sm: 18px badge, 9px text - sidebar badges
 * - default: 20px badge, 12px text - standard notifications
 */
export interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The count to display */
  count: number;
  /** Maximum value before showing "+" (default: 99) */
  max?: number;
  /** Badge color variant */
  variant?: 'primary' | 'secondary' | 'error' | 'gray';
  /** Badge size */
  size?: '2xs' | 'xs' | 'sm' | 'default';
  /** Show badge even when count is 0 (default: false) */
  showZero?: boolean;
}

function CountBadge({
  className,
  count,
  max = 99,
  variant = 'primary',
  size = 'default',
  showZero = false,
  ...props
}: CountBadgeProps): React.ReactElement | null {
  // Return null for zero unless explicitly shown
  if (count <= 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  // Uses theme tokens for colors
  const variantClasses = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    error: 'bg-error text-white',
    gray: 'bg-foreground-secondary text-white',
  };

  const sizeClasses = {
    '2xs': 'min-w-icon-xs h-icon-xs px-0.5 text-nano font-semibold', // 14px badge, 8px text
    xs: 'min-w-icon-sm h-icon-sm px-1 text-micro font-semibold', // 16px badge, 9px text
    sm: 'min-w-icon h-icon px-1 text-micro font-semibold', // 18px badge, 9px text
    default: 'min-w-icon-md h-icon-md px-1.5 text-xs font-medium', // 20px badge, 12px text
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {displayCount}
    </span>
  );
}

export { Badge, badgeVariants, CountBadge, DotBadge };
