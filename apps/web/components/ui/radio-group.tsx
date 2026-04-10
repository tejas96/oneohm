'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { Circle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const radioItemVariants = cva(
  [
    'aspect-square rounded-full border-2 border-border-medium',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:border-primary data-[state=checked]:text-primary',
    'transition-colors duration-fast cursor-pointer',
  ],
  {
    variants: {
      size: {
        sm: 'h-checkbox-sm w-checkbox-sm',
        default: 'h-checkbox-md w-checkbox-md',
        lg: 'h-checkbox-lg w-checkbox-lg',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const INDICATOR_SIZES = {
  sm: 'size-radio-indicator-sm',
  default: 'size-radio-indicator-md',
  lg: 'size-radio-indicator-lg',
} as const;

export interface RadioGroupItemProps
  extends
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    VariantProps<typeof radioItemVariants> {}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, size = 'default', ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(radioItemVariants({ size }), className)}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className={cn(INDICATOR_SIZES[size ?? 'default'], 'fill-primary')} />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem, radioItemVariants };
