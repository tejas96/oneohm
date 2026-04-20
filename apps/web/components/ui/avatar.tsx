'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn, pickDeterministic } from '@/lib/utils';

/**
 * Avatar Component - OneOhm V2 Design System
 *
 * Sizes (per UX avatars.html):
 * - xs: 28px
 * - sm: 32px
 * - default/md: 40px
 * - lg: 48px
 * - xl: 64px
 * - 2xl: 96px
 */
const avatarSizeVariants = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      xs: 'size-7',
      sm: 'size-8',
      default: 'size-10',
      lg: 'size-12',
      xl: 'size-16',
      '2xl': 'size-24',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const avatarFallbackTextVariants = cva('font-semibold', {
  variants: {
    size: {
      xs: 'text-section',
      sm: 'text-xs',
      default: 'text-sm',
      lg: 'text-sm',
      xl: 'text-lg',
      '2xl': 'text-2xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

/** Palette for deterministic avatar fallback colors (same name → same color) */
const AVATAR_FALLBACK_COLORS = [
  'bg-primary/20 text-primary',
  'bg-info/20 text-info',
  'bg-success/20 text-success',
  'bg-warning/20 text-warning',
  'bg-error/20 text-error',
  'bg-foreground-tertiary/20 text-foreground-secondary',
] as const;

type AvatarFallbackColorClass = (typeof AVATAR_FALLBACK_COLORS)[number];

export function getAvatarFallbackColorClass(name: string): string {
  return pickDeterministic(
    name,
    AVATAR_FALLBACK_COLORS,
    AVATAR_FALLBACK_COLORS[0],
  ) as AvatarFallbackColorClass;
}

export interface AvatarProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarSizeVariants> {}

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarSizeVariants({ size }), className)}
      {...props}
    />
  ),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export interface AvatarFallbackProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackTextVariants> {
  /**
   * Optional name or id used to assign a deterministic color.
   * Same value always gets the same color; different values get different colors.
   * When omitted, uses default primary color.
   */
  name?: string;
}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, size, name, ...props }, ref) => {
  const colorClass = name ? getAvatarFallbackColorClass(name) : 'bg-primary/20 text-primary';
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full',
        colorClass,
        avatarFallbackTextVariants({ size }),
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
 * AvatarStatus - Status indicator dot for avatars
 *
 * Usage:
 * <div className="relative">
 *   <Avatar>...</Avatar>
 *   <AvatarStatus status="online" />
 * </div>
 */
// Uses theme tokens for status colors
const statusColors = {
  online: 'bg-success',
  offline: 'bg-foreground-tertiary',
  away: 'bg-warning',
  busy: 'bg-error',
} as const;

export interface AvatarStatusProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: keyof typeof statusColors;
  /** Size matches the avatar size */
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | '2xl';
}

const AvatarStatus = React.forwardRef<HTMLSpanElement, AvatarStatusProps>(
  ({ className, status, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      xs: 'size-1.5 border',
      sm: 'size-2 border-1.5',
      default: 'size-3 border-2',
      lg: 'size-3.5 border-2',
      xl: 'size-4 border-2',
      '2xl': 'size-5 border-3',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-white',
          statusColors[status],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
AvatarStatus.displayName = 'AvatarStatus';

/**
 * AvatarGroup - Stacked avatars for groups
 *
 * Usage:
 * <AvatarGroup max={4}>
 *   <Avatar>...</Avatar>
 *   <Avatar>...</Avatar>
 *   <Avatar>...</Avatar>
 *   <Avatar>...</Avatar>
 *   <Avatar>...</Avatar>
 * </AvatarGroup>
 */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum number of avatars to show before "+X" */
  max?: number;
  /** Size of avatars in the group */
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  children: React.ReactNode;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 4, size = 'default', children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    const overlapClasses = {
      xs: '-space-x-2',
      sm: '-space-x-2',
      default: '-space-x-3',
      lg: '-space-x-3.5',
      xl: '-space-x-4',
    };

    const counterSizeClasses = {
      xs: 'size-7 text-section',
      sm: 'size-8 text-xs',
      default: 'size-10 text-xs',
      lg: 'size-12 text-sm',
      xl: 'size-16 text-sm',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', overlapClasses[size], className)}
        {...props}
      >
        {visibleChildren.map((child, index) => {
          if (React.isValidElement<{ className?: string; size?: string }>(child)) {
            return React.cloneElement(child, {
              key: child.key ?? `avatar-${index}`,
              className: cn(child.props.className, 'border-2 border-white'),
              size,
            });
          }
          return child;
        })}
        {remainingCount > 0 && (
          <div
            className={cn(
              // Uses theme tokens for consistent styling
              'flex items-center justify-center rounded-full border-2 border-background bg-muted text-foreground-secondary font-semibold',
              counterSizeClasses[size],
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  },
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarFallback, AvatarGroup, AvatarImage, AvatarStatus };
