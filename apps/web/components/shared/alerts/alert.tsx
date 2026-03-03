'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Alert Component - OneOhm V2 Design System
 *
 * Variants (per UX alerts.html):
 * - success: Green background, success icon
 * - error: Red background, error icon
 * - warning: Amber background, warning icon
 * - info: Blue background, info icon
 *
 * Styles:
 * - default: With border
 * - minimal: Without border
 * - banner: Full-width solid color
 */
const alertVariants = cva('flex items-start gap-3 rounded-lg text-sm', {
  variants: {
    variant: {
      // Uses theme tokens for consistent styling
      success: 'bg-success/10 border-success/30 text-success',
      error: 'bg-error/10 border-error/30 text-error',
      warning: 'bg-warning/10 border-warning/30 text-warning',
      info: 'bg-info/10 border-info/30 text-info',
    },
    appearance: {
      default: 'p-4 border',
      minimal: 'p-3',
      banner: 'px-4 py-2 rounded-none',
    },
  },
  compoundVariants: [
    // Banner appearance overrides - solid colors with theme tokens
    {
      variant: 'success',
      appearance: 'banner',
      className: 'bg-success text-success-foreground border-0',
    },
    {
      variant: 'error',
      appearance: 'banner',
      className: 'bg-error text-error-foreground border-0',
    },
    {
      variant: 'warning',
      appearance: 'banner',
      className: 'bg-warning text-warning-foreground border-0',
    },
    { variant: 'info', appearance: 'banner', className: 'bg-info text-info-foreground border-0' },
  ],
  defaultVariants: {
    variant: 'info',
    appearance: 'default',
  },
});

const iconVariants = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// Uses theme tokens for icon colors
const iconColorVariants = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Alert title (optional) */
  title?: string;
  /** Show icon */
  icon?: boolean;
  /** Make alert dismissible */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Controlled visibility (optional - if not provided, uses internal state) */
  visible?: boolean;
}

// Theme-based dismiss button colors
const dismissButtonVariants = {
  success: 'text-success hover:bg-success/20',
  error: 'text-error hover:bg-error/20',
  warning: 'text-warning hover:bg-warning/20',
  info: 'text-info hover:bg-info/20',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'info',
      appearance = 'default',
      title,
      icon = true,
      dismissible = false,
      onDismiss,
      actions,
      visible,
      children,
      ...props
    },
    ref,
  ) => {
    // Support both controlled (visible prop) and uncontrolled (internal state)
    const [internalVisible, setInternalVisible] = React.useState(true);
    const isControlled = visible !== undefined;
    const isVisible = isControlled ? visible : internalVisible;

    const IconComponent = variant ? iconVariants[variant] : Info;
    const isBanner = appearance === 'banner';

    const handleDismiss = (): void => {
      if (!isControlled) {
        setInternalVisible(false);
      }
      onDismiss?.();
    };

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, appearance }), className)}
        {...props}
      >
        {icon && (
          <IconComponent
            className={cn(
              'size-icon-md flex-shrink-0 mt-0.5',
              isBanner ? 'text-current' : variant && iconColorVariants[variant],
            )}
          />
        )}
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium">{title}</p>}
          <div className={cn(title && 'mt-1', 'opacity-90')}>{children}</div>
          {actions && <div className="flex gap-3 mt-3">{actions}</div>}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded transition-colors cursor-pointer',
              isBanner ? 'hover:bg-white/20' : variant && dismissButtonVariants[variant],
            )}
            aria-label="Dismiss"
          >
            <X className="size-icon-sm" />
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };
