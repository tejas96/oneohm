'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const switchVariants = cva(
  [
    'peer inline-flex shrink-0 cursor-pointer items-center',
    'rounded-full border-2 border-transparent',
    'transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'bg-border-medium',
    'data-[state=checked]:bg-primary',
  ],
  {
    variants: {
      size: {
        sm: 'h-4 w-7',
        default: 'h-switch-track-h w-switch-track-w',
        lg: 'h-6 w-11',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const switchThumbVariants = cva(
  [
    'pointer-events-none block rounded-full bg-white shadow-md',
    'ring-0 transition-transform duration-fast',
  ],
  {
    variants: {
      size: {
        sm: 'size-3 translate-x-0 data-[state=checked]:translate-x-3',
        default:
          'h-switch-thumb w-switch-thumb translate-x-0 data-[state=checked]:translate-x-switch-thumb',
        lg: 'size-5 translate-x-0 data-[state=checked]:translate-x-5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Label position relative to switch */
  labelPosition?: 'left' | 'right';
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  (
    { className, size = 'default', label, description, labelPosition = 'right', id, ...props },
    ref,
  ) => {
    const switchId = id || React.useId();

    const switchElement = (
      <SwitchPrimitive.Root
        ref={ref}
        id={switchId}
        className={cn(switchVariants({ size }), className)}
        {...props}
      >
        <SwitchPrimitive.Thumb className={switchThumbVariants({ size })} />
      </SwitchPrimitive.Root>
    );

    if (!label && !description) {
      return switchElement;
    }

    return (
      <div className={cn('flex items-start gap-3', labelPosition === 'left' && 'flex-row-reverse')}>
        {switchElement}
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && <p className="text-xs text-foreground-tertiary">{description}</p>}
        </div>
      </div>
    );
  },
);
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch, switchVariants };
