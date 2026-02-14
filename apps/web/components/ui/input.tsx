'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Info, Loader2, X } from 'lucide-react';
import * as React from 'react';


import { Label } from './label';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border-1.5 bg-background px-3 text-sm text-foreground transition-all duration-fast outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-tertiary disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
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
  extends Omit<React.ComponentProps<'input'>, 'size' | 'prefix'>,
    VariantProps<typeof inputVariants> {
  /** Show error styling */
  error?: boolean;

  // Label Integration
  /** Label text */
  label?: string;
  /** Label position relative to input */
  labelPosition?: 'top' | 'left' | 'right';
  /** Label width for inline layouts */
  labelWidth?: string;
  /** Show required asterisk on label */
  required?: boolean;
  /** Show "(optional)" text after label */
  optional?: boolean;
  /** Tooltip content for info icon next to label */
  labelTooltip?: string | React.ReactNode;

  // Helper/Error Text
  /** Helper text below input */
  helperText?: string;
  /** Error message (overrides helperText when error=true) */
  errorMessage?: string;

  // Icons
  /** Icon on the left side of input */
  leftIcon?: React.ReactNode;
  /** Icon on the right side of input */
  rightIcon?: React.ReactNode;
  /** Click handler for right icon */
  onRightIconClick?: () => void;

  // Prefix/Suffix
  /** Text or element displayed as prefix */
  prefix?: string | React.ReactNode;
  /** Text or element displayed as suffix */
  suffix?: string | React.ReactNode;

  // Clearable
  /** Show clear button when input has value */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;

  // Loading
  /** Show loading spinner */
  loading?: boolean;

  /** Container className for the wrapper */
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      type,
      size,
      variant,
      error,
      label,
      labelPosition = 'top',
      labelWidth,
      required,
      optional,
      labelTooltip,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      onRightIconClick,
      prefix,
      suffix,
      clearable,
      onClear,
      loading,
      value,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id || React.useId();
    const hasLeftAddon = leftIcon || prefix;
    const hasRightAddon = rightIcon || suffix || clearable || loading;
    const showClear = clearable && value && !disabled && !loading;
    const displayMessage = error && errorMessage ? errorMessage : helperText;

    const renderLabel = () => {
      if (!label) return null;

      return (
        <div className={cn('flex items-center gap-1', labelWidth)}>
          <Label htmlFor={inputId} required={required}>
            {label}
            {optional && (
              <span className="ml-1 text-foreground-tertiary font-normal">(optional)</span>
            )}
          </Label>
          {labelTooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-icon-xs text-foreground-tertiary cursor-help" />
              </TooltipTrigger>
              <TooltipContent>{labelTooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    };

    const renderInput = () => (
      <div className="relative flex-1">
        {/* Prefix */}
        {prefix && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center pl-3 text-foreground-tertiary text-sm pointer-events-none">
            {prefix}
          </div>
        )}

        {/* Left Icon */}
        {leftIcon && !prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-foreground-tertiary [&_svg]:size-icon-sm pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          id={inputId}
          ref={ref}
          value={value}
          disabled={disabled}
          className={cn(
            inputVariants({ size, variant: error ? 'error' : variant }),
            hasLeftAddon && 'pl-10',
            prefix && 'pl-12',
            hasRightAddon && 'pr-10',
            suffix && 'pr-12',
            className,
          )}
          {...props}
        />

        {/* Right side addons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Loading */}
          {loading && <Loader2 className="size-icon-sm text-foreground-tertiary animate-spin" />}

          {/* Clear button */}
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="p-0.5 rounded hover:bg-muted text-foreground-tertiary hover:text-foreground-secondary transition-colors"
              tabIndex={-1}
            >
              <X className="size-icon-xs" />
            </button>
          )}

          {/* Right Icon */}
          {rightIcon && !loading && !showClear && (
            <div
              className={cn(
                'flex items-center justify-center text-foreground-tertiary [&_svg]:size-icon-sm',
                onRightIconClick &&
                  'cursor-pointer hover:text-foreground-secondary transition-colors',
              )}
              onClick={onRightIconClick}
              role={onRightIconClick ? 'button' : undefined}
              tabIndex={onRightIconClick ? 0 : undefined}
            >
              {rightIcon}
            </div>
          )}

          {/* Suffix */}
          {suffix && !rightIcon && !loading && !showClear && (
            <div className="text-foreground-tertiary text-sm">{suffix}</div>
          )}
        </div>
      </div>
    );

    const renderHelperText = () => {
      if (!displayMessage) return null;

      return (
        <p
          className={cn(
            'text-xs mt-1.5',
            error ? 'text-error' : 'text-foreground-tertiary',
          )}
        >
          {displayMessage}
        </p>
      );
    };

    // No label - render input directly
    if (!label) {
      return (
        <div className={containerClassName}>
          {renderInput()}
          {renderHelperText()}
        </div>
      );
    }

    // Top label (default)
    if (labelPosition === 'top') {
      return (
        <div className={cn('flex flex-col gap-1.5', containerClassName)}>
          {renderLabel()}
          {renderInput()}
          {renderHelperText()}
        </div>
      );
    }

    // Left/Right label (inline)
    return (
      <div className={cn('flex flex-col', containerClassName)}>
        <div
          className={cn(
            'flex items-center gap-3',
            labelPosition === 'right' && 'flex-row-reverse',
          )}
        >
          {renderLabel()}
          {renderInput()}
        </div>
        {renderHelperText()}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
