import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('rounded-full border-3 animate-spin', {
  variants: {
    size: {
      xs: 'size-icon-sm',
      sm: 'size-icon-md',
      md: 'size-icon-lg',
      lg: 'size-icon-xl',
      xl: 'size-container-lg',
    },
    variant: {
      primary: 'border-border border-t-primary',
      white: 'border-white/30 border-t-white',
      muted: 'border-border-medium border-t-foreground-muted',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {
  /** Message to display with spinner */
  message?: string;
  /** Position of message relative to spinner */
  messagePosition?: 'bottom' | 'right';
  /** Show as overlay within parent container (needs relative parent) */
  overlay?: boolean;
  /** Show as full-screen fixed overlay */
  fullScreen?: boolean;
  /** Custom icon to use instead of default spinner */
  icon?: React.ReactNode;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size,
      variant,
      message,
      messagePosition = 'bottom',
      overlay,
      fullScreen,
      icon,
      ...props
    },
    ref,
  ) => {
    const spinnerElement = icon || (
      <div
        className={cn(spinnerVariants({ size, variant }), className)}
        role="status"
        aria-label={message || 'Loading'}
      />
    );

    const content = (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center',
          messagePosition === 'bottom' && 'flex-col gap-2',
          messagePosition === 'right' && 'flex-row gap-3',
        )}
        {...props}
      >
        {spinnerElement}
        {message && (
          <span
            className={cn(
              'text-sm',
              fullScreen || overlay ? 'text-foreground-secondary' : 'text-foreground-tertiary',
            )}
          >
            {message}
          </span>
        )}
      </div>
    );

    if (fullScreen) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          {content}
        </div>
      );
    }

    if (overlay) {
      return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
          {content}
        </div>
      );
    }

    return content;
  },
);
Spinner.displayName = 'Spinner';

const loadingDotsVariants = cva('flex items-center gap-1', {
  variants: {
    size: {
      sm: '[&>span]:w-1.5 [&>span]:h-1.5',
      md: '[&>span]:w-2 [&>span]:h-2',
    },
    variant: {
      muted: '[&>span]:bg-foreground-tertiary',
      primary: '[&>span]:bg-primary',
    },
  },
  defaultVariants: {
    size: 'sm',
    variant: 'muted',
  },
});

export interface LoadingDotsProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof loadingDotsVariants> {}

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
  },
);
LoadingDots.displayName = 'LoadingDots';

export { Spinner, spinnerVariants, LoadingDots, loadingDotsVariants };
