import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Textarea Component - OneOhm V2 Design System
 *
 * Features:
 * - Consistent styling with Input component (per tailwind.config.ts)
 * - Resize control
 * - Error state
 * - Min height of 100px by default
 */
const textareaVariants = cva(
  // Uses theme tokens for consistent styling
  'flex w-full rounded-md border-1.5 bg-background px-input-px py-3 text-sm text-foreground transition-all duration-fast outline-none placeholder:text-foreground-tertiary disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
  {
    variants: {
      variant: {
        default:
          'border-border-medium hover:border-border focus:border-primary focus:ring-focus focus:ring-primary/15',
        error:
          'border-error hover:border-error focus:border-error focus:ring-focus focus:ring-error/15',
      },
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
    },
    defaultVariants: {
      variant: 'default',
      resize: 'vertical',
    },
  },
);

export interface TextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'resize'>,
    VariantProps<typeof textareaVariants> {
  /** Show error styling - accepts boolean or error message string (truthy = error state) */
  error?: boolean | string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, resize, error, ...props }, ref) => {
    const hasError = !!error;
    return (
      <textarea
        className={cn(
          textareaVariants({ variant: hasError ? 'error' : variant, resize }),
          'min-h-textarea-min-h',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
