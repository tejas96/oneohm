'use client';

import { Info, Loader2, X } from 'lucide-react';
import * as React from 'react';

import { Label } from './label';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

import { cn } from '@/lib/utils';

/**
 * Input — DS treatment.
 *
 * **Borderless.** The field reads as a slightly sunken surface carrying `e1`,
 * not a 1px outlined box. That is the DS's one concession on form controls:
 * definition comes from the tinted background plus elevation.
 *
 * - rest    — `surface-alt` fill, `e1`
 * - hover   — one elevation step up
 * - focus   — `e2` plus a 2px accent ring held off the field by a 2px white
 *             gap, so the ring reads clearly against the fill
 * - error   — a 1.5px **inset** ring (not a border, so it never shifts layout)
 * - disabled— sunken canvas, no shadow
 *
 * Radius is 10px, the DS functional input value. `tabular-nums` because these
 * fields take ₹ amounts, capacities and phone numbers.
 */

const INPUT_BASE =
  'flex w-full rounded-[10px] bg-surface-alt px-3 text-sm text-foreground tabular-nums transition-all duration-fast outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:bg-background-tertiary disabled:shadow-none disabled:opacity-70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

type InputSize = 'sm' | 'default' | 'lg';
type InputVariant = 'default' | 'error';

const INPUT_SIZE: Record<InputSize, string> = {
  sm: 'h-input-sm text-xs',
  default: 'h-input-md text-sm',
  lg: 'h-input-lg text-sm',
};

const INPUT_VARIANT: Record<InputVariant, string> = {
  default:
    'shadow-e1 hover:shadow-e2 focus:shadow-[var(--shadow-e2),0_0_0_2px_var(--ds-surface),0_0_0_4px_var(--ds-accent)]',
  // Inset so the ring costs no layout space and the field never jumps.
  error:
    'shadow-[inset_0_0_0_1.5px_var(--ds-danger),var(--shadow-e1)] focus:shadow-[var(--shadow-e2),0_0_0_2px_var(--ds-surface),0_0_0_4px_var(--ds-danger)]',
};

const inputVariants = ({
  size = 'lg',
  variant = 'default',
}: { size?: InputSize | null; variant?: InputVariant | null } = {}): string =>
  cn(INPUT_BASE, INPUT_SIZE[size ?? 'lg'], INPUT_VARIANT[variant ?? 'default']);

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size' | 'prefix'> {
  size?: InputSize | null;
  variant?: InputVariant | null;
  /** Show error styling - accepts boolean or error message string (truthy = error state) */
  error?: boolean | string;

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
      onWheel,
      ...props
    },
    ref,
  ) => {
    const inputId = id || React.useId();
    const hasRightAddon = rightIcon || suffix || clearable || loading;
    const showClear = clearable && value && !disabled && !loading;
    // Coerce error to boolean for styling, and derive error message
    const hasError = !!error;
    const derivedErrorMessage = errorMessage || (typeof error === 'string' ? error : undefined);
    const displayMessage = hasError && derivedErrorMessage ? derivedErrorMessage : helperText;

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
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center pl-2.5 text-foreground-tertiary text-sm pointer-events-none">
            {prefix}
          </div>
        )}

        {/* Left Icon */}
        {leftIcon && !prefix && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-foreground-tertiary [&_svg]:size-icon-sm pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          id={inputId}
          ref={ref}
          value={value}
          disabled={disabled}
          onWheel={
            type === 'number'
              ? (e) => {
                  onWheel?.(e);
                  if (!e.defaultPrevented) {
                    e.currentTarget.blur();
                  }
                }
              : onWheel
          }
          className={cn(
            inputVariants({ size, variant: hasError ? 'error' : variant }),
            leftIcon && !prefix && 'pl-9',
            prefix && 'pl-9',
            hasRightAddon && 'pr-8',
            suffix && 'pr-8',
            className,
          )}
          {...props}
        />

        {/* Right side addons */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
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
        <p className={cn('text-xs mt-1.5', hasError ? 'text-error' : 'text-foreground-tertiary')}>
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
        <div className={cn('flex flex-col gap-2', containerClassName)}>
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
          className={cn('flex items-center gap-3', labelPosition === 'right' && 'flex-row-reverse')}
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
