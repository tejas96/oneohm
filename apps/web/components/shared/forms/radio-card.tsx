'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as React from 'react';

import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface RadioCardProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  /** Card title */
  title: string;
  /** Optional description text */
  description?: string;
}

const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioCardProps
>(({ className, title, description, value, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    value={value}
    className={cn(
      // Base styling
      'relative flex cursor-pointer items-start gap-3 rounded-lg border p-3',
      'transition-all duration-fast',
      // Default state
      'border-border-light bg-background',
      // Hover state
      'hover:border-primary/50 hover:bg-primary/5',
      // Selected state (using data attribute from Radix)
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary/5',
      // Focus state
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
      // Disabled state
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {/* Radio indicator - inherits state from parent RadioGroupPrimitive.Item */}
    <div
      className={cn(
        'mt-0.5 h-checkbox-md w-checkbox-md shrink-0 rounded-full border-2 border-gray-300',
        'flex items-center justify-center transition-colors duration-fast',
        // Radix propagates data-state to children automatically
      )}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
      </RadioGroupPrimitive.Indicator>
    </div>

    {/* Content */}
    <div className="flex-1 space-y-1">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && (
        <div className="text-xs text-foreground-tertiary">{description}</div>
      )}
    </div>
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = 'RadioCard';

export interface RadioCardGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  /** Orientation of the cards */
  orientation?: 'horizontal' | 'vertical';
}

const RadioCardGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioCardGroupProps
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <RadioGroup
    ref={ref}
    className={cn(
      orientation === 'vertical' ? 'flex flex-col gap-3' : 'flex flex-wrap gap-3',
      className,
    )}
    {...props}
  />
));
RadioCardGroup.displayName = 'RadioCardGroup';

export { RadioCard, RadioCardGroup };
