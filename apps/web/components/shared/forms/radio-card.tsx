'use client';

import { Indicator, Item, Root } from '@radix-ui/react-radio-group';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface RadioCardProps {
  /** Card title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Radio value (required) */
  value: string;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

const RadioCard = React.forwardRef<HTMLButtonElement, RadioCardProps>(
  ({ className, title, description, value, disabled, ...props }, ref) => (
    <Item
      ref={ref}
      value={value}
      disabled={disabled}
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
      {/* Radio indicator */}
      <div
        className={cn(
          'mt-0.5 h-checkbox-md w-checkbox-md shrink-0 rounded-full border-2 border-border-medium',
          'flex items-center justify-center transition-colors duration-fast',
        )}
      >
        <Indicator className="flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        </Indicator>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && <div className="text-xs text-foreground-tertiary">{description}</div>}
      </div>
    </Item>
  ),
);
RadioCard.displayName = 'RadioCard';

export interface RadioCardGroupProps {
  /** Radio card children */
  children: React.ReactNode;
  /** Currently selected value */
  value?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Orientation of the cards */
  orientation?: 'horizontal' | 'vertical';
  /** Default value for uncontrolled usage */
  defaultValue?: string;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Name for form submission */
  name?: string;
  /** Additional className */
  className?: string;
}

const RadioCardGroup = React.forwardRef<HTMLDivElement, RadioCardGroupProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => (
    <Root
      ref={ref}
      className={cn(
        orientation === 'vertical' ? 'flex flex-col gap-3' : 'flex flex-wrap gap-3',
        className,
      )}
      {...props}
    >
      {children}
    </Root>
  ),
);
RadioCardGroup.displayName = 'RadioCardGroup';

export { RadioCard, RadioCardGroup };
