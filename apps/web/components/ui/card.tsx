import { cva, type VariantProps } from 'class-variance-authority';
import { TrendingUp, TrendingDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card Component - OneOhm Design System
 *
 * Variants:
 * - default: Standard card with subtle border
 * - elevated: Card with shadow for prominence
 * - interactive: Clickable card with hover effects
 * - minimal: No border, just background
 *
 * Padding:
 * - none: No padding
 * - sm: p-3 (compact)
 * - default: p-4 (standard - p-card per theme)
 * - lg: p-6 (spacious)
 *
 * Reference: apps/ux/web/v2/components/cards.html
 */

const cardVariants = cva(
  // Base styles
  'rounded-lg bg-card text-card-foreground transition-all duration-fast',
  {
    variants: {
      variant: {
        default: 'border border-border-light/50 shadow-card',
        elevated: 'border border-border-light/50 shadow-card hover:shadow-card-hover',
        interactive:
          'border border-border-light/50 shadow-card cursor-pointer hover:border-primary hover:shadow-card-hover group',
        minimal: 'bg-background-secondary',
      },
      padding: {
        none: '',
        sm: 'p-3',
        default: 'p-card',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none', // Individual sections handle padding
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props} />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between px-card py-4 border-b border-border-light',
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
        'flex items-center px-card py-4 bg-background-secondary border-t border-border-light rounded-b-lg',
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

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatsCard,
  cardVariants,
};

export type { CardProps as CardPropsType };
