'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        // Track styling (using theme tokens)
        'peer inline-flex h-switch-track-h w-switch-track-w shrink-0 cursor-pointer items-center',
        'rounded-full border-2 border-transparent',
        'transition-colors duration-fast',
        // States
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Off state
        'bg-gray-300',
        // On state
        'data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          // Thumb styling (using theme tokens)
          'pointer-events-none block h-switch-thumb w-switch-thumb rounded-full bg-white shadow-md',
          'ring-0 transition-transform duration-fast',
          // Position based on state (translate = track-w - thumb - border)
          'translate-x-0 data-[state=checked]:translate-x-switch-thumb',
        )}
      />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
