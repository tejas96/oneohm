'use client';

import * as React from 'react';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Progress Component
 * Linear progress bar with size and color variants
 * 
 * Heights use standard Tailwind spacing:
 * - xs: h-0.5 (2px)
 * - sm: h-1 (4px)
 * - md: h-2 (8px)
 * - lg: h-3 (12px)
 * - xl: h-4 (16px)
 */

const progressVariants = cva('w-full rounded-full overflow-hidden bg-gray-200', {
  variants: {
    size: {
      xs: 'h-0.5',
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
      xl: 'h-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const indicatorVariants = cva('h-full rounded-full transition-all', {
  variants: {
    variant: {
      primary: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
      info: 'bg-info',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  /** Show percentage label */
  showLabel?: boolean;
  /** Indeterminate loading state */
  indeterminate?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, showLabel, indeterminate, ...props }, ref) => (
  <div className="relative">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(progressVariants({ size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          indicatorVariants({ variant }),
          indeterminate && 'animate-pulse w-1/3'
        )}
        style={indeterminate ? undefined : { width: `${value || 0}%` }}
      />
    </ProgressPrimitive.Root>
    {showLabel && size === 'xl' && !indeterminate && (
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white">
        {value}%
      </span>
    )}
  </div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

/**
 * ProgressWithLabel Component
 * Progress bar with external label showing percentage
 */
export interface ProgressWithLabelProps extends Omit<ProgressProps, 'showLabel'> {
  label?: string;
}

const ProgressWithLabel = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressWithLabelProps
>(({ label, value, className, ...props }, ref) => (
  <div className={className}>
    <div className="flex justify-between text-sm mb-2">
      <span className="text-foreground-secondary">{label || 'Progress'}</span>
      <span className="text-foreground font-medium">{value}%</span>
    </div>
    <Progress ref={ref} value={value} {...props} />
  </div>
));
ProgressWithLabel.displayName = 'ProgressWithLabel';

/**
 * CircularProgress Component
 * SVG-based circular progress indicator
 * 
 * Sizes use standard Tailwind:
 * - sm: w-16 h-16 (64px)
 * - md: w-24 h-24 (96px)
 * - lg: w-32 h-32 (128px)
 */
const CIRCULAR_CONFIG = {
  sm: { size: 64, radius: 28, strokeWidth: 4 },
  md: { size: 96, radius: 42, strokeWidth: 6 },
  lg: { size: 128, radius: 56, strokeWidth: 8 },
} as const;

export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
  label?: string;
}

const VARIANT_COLORS: Record<NonNullable<CircularProgressProps['variant']>, string> = {
  primary: '#76c044',
  success: '#22c55e',
  warning: '#eab308',
  error: '#dc2626',
  info: '#0ea5e9',
};

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value = 0, size = 'md', variant = 'primary', showLabel = true, label, className, ...props }, ref) => {
    const config = CIRCULAR_CONFIG[size];
    const circumference = 2 * Math.PI * config.radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    const center = config.size / 2;

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex', className)}
        {...props}
      >
        <svg
          className={cn(
            'transform -rotate-90',
            size === 'sm' && 'w-16 h-16',
            size === 'md' && 'w-24 h-24',
            size === 'lg' && 'w-32 h-32'
          )}
          viewBox={`0 0 ${config.size} ${config.size}`}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            stroke={VARIANT_COLORS[variant]}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-normal"
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                'font-semibold text-foreground',
                size === 'sm' && 'text-sm',
                size === 'md' && 'text-lg',
                size === 'lg' && 'text-2xl'
              )}
            >
              {value}%
            </span>
            {label && size === 'lg' && (
              <span className="text-xs text-foreground-secondary">{label}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

/**
 * SegmentedProgress Component
 * Multi-step progress indicator
 */
export interface SegmentedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Array<{
    label: string;
    status: 'complete' | 'current' | 'pending';
  }>;
}

const SEGMENT_STATUS_CLASSES = {
  complete: 'bg-success',
  current: 'bg-warning',
  pending: 'bg-gray-200',
} as const;

const SegmentedProgress = React.forwardRef<HTMLDivElement, SegmentedProgressProps>(
  ({ steps, className, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      <div className="flex gap-1">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              'flex-1 h-2',
              SEGMENT_STATUS_CLASSES[step.status],
              index === 0 && 'rounded-l-full',
              index === steps.length - 1 && 'rounded-r-full'
            )}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-foreground-secondary mt-2">
        {steps.map((step) => (
          <span key={step.label}>{step.label}</span>
        ))}
      </div>
    </div>
  )
);
SegmentedProgress.displayName = 'SegmentedProgress';

export {
  Progress,
  progressVariants,
  indicatorVariants,
  ProgressWithLabel,
  CircularProgress,
  SegmentedProgress,
};
