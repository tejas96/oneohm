import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

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
  'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Default - Primary green (uses theme tokens)
        default: 'border-transparent bg-primary/10 text-primary',

        // Secondary - Gray (uses theme tokens)
        secondary: 'border-transparent bg-muted text-foreground-secondary',

        // Success - Green (uses theme tokens)
        success: 'border-transparent bg-success/15 text-success',

        // Warning - Amber (uses theme tokens)
        warning: 'border-transparent bg-warning/15 text-warning',

        // Error/Destructive - Red (uses theme tokens)
        error: 'border-transparent bg-error/15 text-error',
        destructive: 'border-transparent bg-error/15 text-error',

        // Info - Blue (uses theme tokens)
        info: 'border-transparent bg-info/15 text-info',

        // Pending - Purple (uses theme tokens - mapped to info variant for now)
        pending: 'border-transparent bg-purple-100 text-purple-700',

        // Outline - Border only (uses theme tokens)
        outline: 'border-border-medium bg-transparent text-foreground-secondary',

        // Muted - Subtle gray tag style (uses theme tokens)
        muted: 'border-muted bg-muted text-foreground-tertiary',

        // Lead Temperature - Hot (red solid, uses theme tokens)
        hot: 'border-transparent bg-error text-error-foreground',

        // Lead Temperature - Warm (orange solid, uses theme tokens)
        warm: 'border-transparent bg-warning text-warning-foreground',

        // Lead Temperature - Cold (blue solid, uses theme tokens)
        cold: 'border-transparent bg-info text-info-foreground',

        // Count - For notification badges (uses theme tokens)
        count: 'border-transparent bg-primary text-white',
      },
      size: {
        // Small - compact badges
        sm: 'px-2 py-0.5 text-[10px]',
        // Default
        default: 'px-2.5 py-1 text-xs',
        // Large
        lg: 'px-3 py-1.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
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
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
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
    gray: 'bg-gray-400',
    amber: 'bg-warning',
    red: 'bg-error',
    blue: 'bg-info',
  };

  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-foreground', className)} {...props}>
      <span className={cn('size-2 rounded-full', dotColors[color])} />
      {children}
    </span>
  );
}

/**
 * CountBadge - Numeric badge for notifications
 * Shows count with optional max value (e.g., "99+")
 */
export interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The count to display */
  count: number;
  /** Maximum value before showing "+" (default: 99) */
  max?: number;
  /** Badge color variant */
  variant?: 'primary' | 'error' | 'gray';
  /** Show badge even when count is 0 (default: false) */
  showZero?: boolean;
}

function CountBadge({
  className,
  count,
  max = 99,
  variant = 'primary',
  showZero = false,
  ...props
}: CountBadgeProps): React.ReactElement | null {
  // Return null for zero unless explicitly shown
  if (count <= 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  // Uses theme tokens for colors
  const variantClasses = {
    primary: 'bg-primary text-white',
    error: 'bg-error text-error-foreground',
    gray: 'bg-muted text-foreground-secondary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-medium',
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
