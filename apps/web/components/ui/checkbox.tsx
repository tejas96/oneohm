'use client';

import { Check, Minus } from 'lucide-react';
import * as React from 'react';

import { cva, type VariantProps } from '@/lib/cva';
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
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'checked' | 'onChange'>,
    VariantProps<typeof checkboxVariants> {
  /** Checked state */
  checked?: boolean;
  /** Radix-compatible change handler, used by ~32 call sites. */
  onCheckedChange?: (checked: boolean) => void;
  /** Indeterminate state (for "select all" partial selection) */
  indeterminate?: boolean;
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Show error styling */
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      size = 'default',
      checked,
      indeterminate,
      label,
      description,
      error,
      id,
      onCheckedChange,
      onClick,
      ...props
    },
    ref,
  ) => {
    const checkboxId = id || React.useId();

    const checkboxElement = (
      /**
       * A native button rather than MUI's `Checkbox`: MUI renders its own SVG
       * control, which would replace the lucide Check/Minus glyphs and ignore
       * the `data-[state=checked]` classes these variants are built on.
       * `aria-checked="mixed"` is the correct ARIA value for indeterminate.
       */
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={checkboxId}
        aria-checked={indeterminate ? 'mixed' : Boolean(checked)}
        data-state={indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'}
        onClick={(e) => {
          onClick?.(e);
          if (!props.disabled) onCheckedChange?.(!checked);
        }}
        className={cn(
          checkboxVariants({ size }),
          error && 'border-error data-[state=checked]:bg-error data-[state=checked]:border-error',
          className,
        )}
        {...props}
      >
        {(checked || indeterminate) && (
          <span className="flex items-center justify-center text-current">
            {indeterminate ? (
              <Minus className={CHECK_ICON_SIZES[size ?? 'default']} strokeWidth={3} />
            ) : (
              <Check className={CHECK_ICON_SIZES[size ?? 'default']} strokeWidth={3} />
            )}
          </span>
        )}
      </button>
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
          {description && <p className="text-xs text-foreground-tertiary">{description}</p>}
        </div>
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox, checkboxVariants };
