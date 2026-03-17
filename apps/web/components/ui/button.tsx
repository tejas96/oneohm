import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Button Component - OneOhm V2 Design System
 *
 * Sizes (per tailwind.config.ts):
 * - sm: 28px height (h-btn-sm)
 * - md: 32px height (h-btn-md) - default
 * - lg: 36px height (h-btn-lg)
 *
 * Variants:
 * - default (primary): Green background
 * - secondary: Blue background
 * - destructive: Red background
 * - destructive-outline: Red text with red border
 * - success: Green background
 * - warning: Amber background
 * - outline: Gray border, transparent bg
 * - ghost: No border, transparent bg
 * - link: Underlined text, no background
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary - OneOhm Green (uses theme tokens)
        default: 'bg-primary text-white shadow-sm hover:bg-primary-dark active:bg-primary-dark/90',

        // Secondary - OneOhm Blue (uses theme tokens)
        secondary:
          'bg-secondary text-white shadow-sm hover:bg-secondary-dark active:bg-secondary-dark/90',

        // Destructive - Red (uses theme tokens)
        destructive:
          'bg-error text-error-foreground shadow-sm hover:bg-error/90 active:bg-error/80',

        // Destructive Outline - Red border and text (uses theme tokens)
        'destructive-outline':
          'border-1.5 border-error/30 bg-transparent text-error hover:bg-error/10 hover:border-error/50',

        // Success - Green (uses theme tokens)
        success:
          'bg-success text-success-foreground shadow-sm hover:bg-success/90 active:bg-success/80',

        // Warning - Amber (uses theme tokens)
        warning:
          'bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 active:bg-warning/80',

        // Outline - Gray border (uses theme tokens)
        outline:
          'border-1.5 border-border-medium bg-transparent text-foreground-secondary hover:bg-muted hover:border-border active:bg-muted/80',

        // Ghost - No border, transparent (uses theme tokens)
        ghost: 'bg-transparent text-foreground-secondary hover:bg-muted active:bg-muted/80',

        // Link - Underlined text (uses theme tokens)
        link: 'bg-transparent text-secondary underline underline-offset-2 hover:text-secondary-dark p-0 h-auto',
      },
      size: {
        // Small: 28px height (per tailwind.config.ts)
        sm: 'h-btn-sm px-btn-px-sm text-xs [&_svg]:size-3.5',
        // Medium: 32px height (per tailwind.config.ts) - default
        default: 'h-btn-md px-btn-px-md text-sm [&_svg]:size-4',
        // Large: 36px height (per tailwind.config.ts)
        lg: 'h-btn-lg px-btn-px-lg text-sm [&_svg]:size-4',
        // Icon only - square buttons using theme tokens
        icon: 'size-btn-md p-0 [&_svg]:size-4',
        'icon-sm': 'size-btn-sm p-0 [&_svg]:size-3.5',
        'icon-lg': 'size-btn-lg p-0 [&_svg]:size-4',
      },
      pill: {
        true: 'rounded-full',
        false: '',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      pill: false,
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      pill,
      fullWidth,
      asChild = false,
      loading = false,
      disabled,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, pill, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        {...(asChild ? (type ? { type } : {}) : { type: type ?? 'button' })}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            <span className="sr-only">Loading</span>
            {/* Keep children visible but make room for spinner */}
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
