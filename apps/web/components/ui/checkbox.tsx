'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const checkboxVariants = cva(
  [
    'peer shrink-0 rounded-sm border-2 border-border-medium',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white',
    'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-white',
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
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'checked'>,
    VariantProps<typeof checkboxVariants> {
  /** Checked state */
  checked?: boolean;
  /** Indeterminate state (for "select all" partial selection) */
  indeterminate?: boolean;
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Show error styling */
  error?: boolean;
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  (
    { className, size = 'default', checked, indeterminate, label, description, error, id, ...props },
    ref,
  ) => {
    const checkboxId = id || React.useId();
    const checkState = indeterminate ? 'indeterminate' : checked;

    const checkboxElement = (
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        checked={checkState}
        className={cn(
          checkboxVariants({ size }),
          error && 'border-error data-[state=checked]:bg-error data-[state=checked]:border-error',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          {indeterminate ? (
            <Minus className={CHECK_ICON_SIZES[size ?? 'default']} strokeWidth={3} />
          ) : (
            <Check className={CHECK_ICON_SIZES[size ?? 'default']} strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (!label && !description) {
      return checkboxElement;
    }

    return (
      <div className="flex items-start gap-2">
        {checkboxElement}
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                error && 'text-error',
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-foreground-tertiary">{description}</p>
          )}
        </div>
      </div>
    );
  },
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox, checkboxVariants };
