import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Spinner Component
 * Loading indicator with size and color variants
 * 
 * Sizes use standard Tailwind spacing:
 * - xs: w-4 h-4 (16px)
 * - sm: w-5 h-5 (20px)
 * - md: w-6 h-6 (24px)
 * - lg: w-8 h-8 (32px)
 * - xl: w-12 h-12 (48px)
 */
const spinnerVariants = cva('rounded-full border-3 animate-spin', {
  variants: {
    size: {
      xs: 'w-4 h-4',
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    },
    variant: {
      primary: 'border-gray-200 border-t-primary',
      white: 'border-white/30 border-t-white',
      muted: 'border-gray-300 border-t-gray-600',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant }), className)}
        role="status"
        aria-label="Loading"
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

/**
 * LoadingDots Component
 * Animated dots for typing/processing indicators
 */
const loadingDotsVariants = cva('flex items-center gap-1', {
  variants: {
    size: {
      sm: '[&>span]:w-1.5 [&>span]:h-1.5',
      md: '[&>span]:w-2 [&>span]:h-2',
    },
    variant: {
      muted: '[&>span]:bg-gray-400',
      primary: '[&>span]:bg-primary',
    },
  },
  defaultVariants: {
    size: 'sm',
    variant: 'muted',
  },
});

export interface LoadingDotsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingDotsVariants> {}

const LoadingDots = React.forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(loadingDotsVariants({ size, variant }), className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="rounded-full animate-bounce [animation-delay:-0.32s]" />
        <span className="rounded-full animate-bounce [animation-delay:-0.16s]" />
        <span className="rounded-full animate-bounce" />
      </div>
    );
  }
);
LoadingDots.displayName = 'LoadingDots';

export { Spinner, spinnerVariants, LoadingDots, loadingDotsVariants };
