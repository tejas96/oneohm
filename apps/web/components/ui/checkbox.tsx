'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const checkboxVariants = cva(
  [
    'peer shrink-0 rounded-sm border-2 border-gray-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white',
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

const CHECK_ICON_SIZES = {
  sm: 'size-checkbox-sm',
  default: 'size-checkbox-md',
  lg: 'size-checkbox-lg',
} as const;

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className={CHECK_ICON_SIZES[size ?? 'default']} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox, checkboxVariants };
