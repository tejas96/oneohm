'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import { HelpCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Tooltip Component - OneOhm Design System
 *
 * Features:
 * - Primary theme (default) with brand green background
 * - Secondary theme with brand blue background
 * - Dark theme with gray-900 background
 * - Light theme option
 * - Arrow indicator
 * - z-tooltip from theme
 * - Rich content support
 *
 * Reference: apps/ux/web/v2/components/tooltips.html
 */

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const tooltipContentVariants = cva(
  // Base styles
  [
    'z-tooltip overflow-hidden rounded-lg px-3 py-1.5 text-xs',
    'animate-in fade-in-0 zoom-in-95',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    'data-[side=bottom]:slide-in-from-top-2',
    'data-[side=left]:slide-in-from-right-2',
    'data-[side=right]:slide-in-from-left-2',
    'data-[side=top]:slide-in-from-bottom-2',
    'origin-[--radix-tooltip-content-transform-origin]',
  ],
  {
    variants: {
      variant: {
        dark: 'bg-gray-900 text-white',
        primary: 'bg-primary-dark text-white',
        secondary: 'bg-secondary text-white',
        light: 'bg-background text-foreground shadow-sm border border-border-light',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

/** Arrow colors per variant - module scope for performance */
const ARROW_COLORS = {
  dark: 'text-gray-900',
  primary: 'text-primary-dark',
  secondary: 'text-secondary',
  light: 'text-background drop-shadow-sm',
} as const;

/** Rich tooltip text colors per variant */
const RICH_TEXT_COLORS = {
  dark: 'text-gray-300',
  primary: 'text-white/80',
  secondary: 'text-white/80',
  light: 'text-foreground-secondary',
} as const;

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  /** Show arrow indicator */
  showArrow?: boolean;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, variant = 'primary', showArrow = false, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(tooltipContentVariants({ variant }), className)}
      {...props}
    >
      {children}
      {showArrow && (
        <TooltipPrimitive.Arrow
          className={cn('fill-current', ARROW_COLORS[variant ?? 'primary'])}
          width={8}
          height={4}
        />
      )}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * RichTooltip - Tooltip with title and description
 * Reference: apps/ux/web/v2/components/tooltips.html - Rich Content Tooltips
 */
export interface RichTooltipContentProps extends TooltipContentProps {
  title?: string;
}

const RichTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  RichTooltipContentProps
>(({ className, variant = 'primary', title, children, ...props }, ref) => (
  <TooltipContent
    ref={ref}
    variant={variant}
    className={cn('p-3 w-tooltip', className)}
    {...props}
  >
    {title && <p className="font-medium mb-1">{title}</p>}
    <div className={cn('leading-relaxed', RICH_TEXT_COLORS[variant ?? 'primary'])}>{children}</div>
  </TooltipContent>
));
RichTooltipContent.displayName = 'RichTooltipContent';

/**
 * HelpTooltip - Form field help text tooltip
 * Pre-built trigger with help icon
 */
export interface HelpTooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const HelpTooltip = React.forwardRef<HTMLButtonElement, HelpTooltipProps>(
  ({ content, side = 'top' }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          className="text-foreground-tertiary hover:text-foreground-secondary cursor-help"
          aria-label="Help"
        >
          <HelpCircle className="size-icon-sm" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} showArrow className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  ),
);
HelpTooltip.displayName = 'HelpTooltip';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  RichTooltipContent,
  HelpTooltip,
  tooltipContentVariants,
};

// Types are already exported via interface declarations above
