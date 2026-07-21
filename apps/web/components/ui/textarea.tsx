import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Textarea — DS treatment, matching `Input` exactly.
 *
 * Borderless: `surface-alt` fill on `e1`, elevation step on hover, 2px accent
 * ring with a white gap on focus, inset 1.5px ring for error. See `input.tsx`
 * for the full rationale — the two must stay visually identical or a form
 * mixing them looks broken.
 */

const TEXTAREA_BASE =
  'flex w-full rounded-[10px] bg-surface-alt px-input-px py-3 text-sm text-foreground transition-all duration-fast outline-none placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:bg-background-tertiary disabled:shadow-none disabled:opacity-70';

type TextareaSize = 'sm' | 'md' | 'lg';
type TextareaVariant = 'default' | 'error';
type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

const TEXTAREA_SIZE: Record<TextareaSize, string> = {
  sm: 'min-h-[72px]',
  md: 'min-h-[88px]',
  lg: 'min-h-textarea-min-h',
};

const TEXTAREA_VARIANT: Record<TextareaVariant, string> = {
  default:
    'shadow-e1 hover:shadow-e2 focus:shadow-[var(--shadow-e2),0_0_0_2px_var(--ds-surface),0_0_0_4px_var(--ds-accent)]',
  error:
    'shadow-[inset_0_0_0_1.5px_var(--ds-danger),var(--shadow-e1)] focus:shadow-[var(--shadow-e2),0_0_0_2px_var(--ds-surface),0_0_0_4px_var(--ds-danger)]',
};

const TEXTAREA_RESIZE: Record<TextareaResize, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

const textareaVariants = ({
  size = 'lg',
  variant = 'default',
  resize = 'vertical',
}: {
  size?: TextareaSize | null;
  variant?: TextareaVariant | null;
  resize?: TextareaResize | null;
} = {}): string =>
  cn(
    TEXTAREA_BASE,
    TEXTAREA_SIZE[size ?? 'lg'],
    TEXTAREA_VARIANT[variant ?? 'default'],
    TEXTAREA_RESIZE[resize ?? 'vertical'],
  );

export interface TextareaProps extends Omit<React.ComponentProps<'textarea'>, 'resize' | 'size'> {
  size?: TextareaSize | null;
  variant?: TextareaVariant | null;
  resize?: TextareaResize | null;
  /** Show error styling - accepts boolean or error message string (truthy = error state) */
  error?: boolean | string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, variant, resize, error, ...props }, ref) => {
    const hasError = !!error;
    return (
      <textarea
        className={cn(
          textareaVariants({ size, variant: hasError ? 'error' : variant, resize }),
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
