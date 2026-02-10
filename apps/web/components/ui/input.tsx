import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Input Component - OneOhm V2 Design System
 *
 * Sizes (per tailwind.config.ts):
 * - sm: 28px height (h-input-sm)
 * - default: 32px height (h-input-md)
 * - lg: 36px height (h-input-lg)
 *
 * Features:
 * - Error state with red border
 * - Icon support (use InputWrapper for icons)
 * - Focus ring with primary color
 */
const inputVariants = cva(
  // Uses theme tokens for consistent styling
  'flex w-full rounded-md border-1.5 bg-background px-input-px text-sm text-foreground transition-all duration-fast outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-tertiary disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
  {
    variants: {
      size: {
        sm: 'h-input-sm text-xs',
        default: 'h-input-md text-sm',
        lg: 'h-input-lg text-sm',
      },
      variant: {
        default:
          'border-border-medium hover:border-border focus:border-primary focus:ring-focus focus:ring-primary/15',
        error:
          'border-error hover:border-error focus:border-error focus:ring-focus focus:ring-error/15',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Show error styling */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, variant, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          inputVariants({ size, variant: error ? 'error' : variant }),
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

/**
 * InputWrapper - Container for inputs with icons
 *
 * Usage:
 * <InputWrapper>
 *   <InputIcon position="left"><SearchIcon /></InputIcon>
 *   <Input className="pl-10" placeholder="Search..." />
 * </InputWrapper>
 */
export interface InputWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const InputWrapper = React.forwardRef<HTMLDivElement, InputWrapperProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {children}
      </div>
    );
  },
);
InputWrapper.displayName = 'InputWrapper';

export interface InputIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Position of the icon */
  position?: 'left' | 'right';
  /** Enable pointer events for clickable icons (e.g., password toggle) */
  clickable?: boolean;
  children: React.ReactNode;
}

const InputIcon = React.forwardRef<HTMLDivElement, InputIconProps>(
  ({ className, position = 'left', clickable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Uses theme tokens for icon color
          'absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-foreground-tertiary [&_svg]:size-5',
          position === 'left' ? 'left-3.5' : 'right-3.5',
          clickable ? 'cursor-pointer hover:text-foreground-secondary' : 'pointer-events-none',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
InputIcon.displayName = 'InputIcon';

export { Input, inputVariants, InputWrapper, InputIcon };
