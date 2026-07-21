import { TrendingUp, TrendingDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card — OneOhm design system.
 *
 * The governing rule: **hierarchy comes from luminance and softness, never
 * from lines.** A card separates from the canvas by being brighter than it
 * and carrying a soft, wide, low-opacity shadow. Every variant here was
 * previously `border border-border-light/50`; none carry a border now.
 *
 * Elevation ladder — `e2` at rest, `e3` on hover, plus a −1px lift. Hover
 * raises exactly one step; it never jumps.
 *
 * Radius is 12px (`rounded-xl`), the DS *functional* card value, matching the
 * density chosen for this app's data-heavy surfaces.
 *
 * Variants:
 * - `default`     — resting card
 * - `elevated`    — same, lifts on hover
 * - `interactive` — clickable; lift + 2px accent ring on hover
 * - `minimal`     — sits flush on the canvas, no shadow
 *
 * Padding: `none` (default — sections handle their own) | `sm` | `default` | `lg`
 *
 * Plain `<div>`s rather than MUI `Card`: this is a compound layout component
 * and MUI's Card/CardHeader/CardContent impose their own DOM and padding,
 * which would reflow every consumer. Tailwind-only is within the two-library
 * constraint; `class-variance-authority` is what needed removing.
 */

type CardVariant = 'default' | 'elevated' | 'interactive' | 'minimal';
type CardPadding = 'none' | 'sm' | 'default' | 'lg';

const CARD_BASE = 'rounded-xl bg-card text-card-foreground transition-all duration-fast';

const CARD_VARIANT: Record<CardVariant, string> = {
  default: 'shadow-e2',
  elevated: 'shadow-e2 hover:shadow-e3 hover:-translate-y-px',
  interactive:
    'shadow-e2 cursor-pointer hover:shadow-e3 hover:-translate-y-px hover:ring-2 hover:ring-primary group',
  // Flush with the canvas — the one surface that is *not* raised.
  minimal: 'bg-background-secondary',
};

const CARD_PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  default: 'p-card',
  lg: 'p-6',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'none', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(CARD_BASE, CARD_VARIANT[variant], CARD_PADDING[padding], className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // No rule under the header — spacing and type weight carry the
        // separation, per the DS "no structural borders" rule.
        'flex items-center justify-between px-card py-4',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-semibold text-foreground leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-foreground-secondary mt-1', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-card', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // The tinted background already separates the footer by luminance,
        // so the top rule is redundant as well as off-spec.
        'flex items-center px-card py-4 bg-background-secondary rounded-b-xl',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

/**
 * StatsCard - Dashboard-style card for metrics
 * Reference: apps/ux/web/v2/components/cards.html - Stats Card section
 */
export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, title, value, trend, icon, ...props }, ref) => {
    const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

    return (
      <Card ref={ref} variant="default" padding="default" className={className} {...props}>
        <div className="flex items-center justify-between mb-4">
          {icon && (
            <div className="size-container-md bg-primary/10 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
          {trend && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trend.direction === 'up' ? 'text-success' : 'text-error',
              )}
            >
              <TrendIcon className="size-icon-sm mr-1" />
              {trend.value}%
            </span>
          )}
        </div>
        <p className="text-xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-foreground-secondary">{title}</p>
      </Card>
    );
  },
);
StatsCard.displayName = 'StatsCard';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, StatsCard };

export type { CardProps as CardPropsType };
