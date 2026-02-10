import { cva, type VariantProps } from 'class-variance-authority';
import {
  AlertTriangle,
  FileText,
  Inbox,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState Component
 * Placeholder content for empty lists, tables, and error states
 * 
 * Icon container sizes use standard Tailwind:
 * - default: w-20 h-20 (80px)
 * - compact: w-12 h-12 (48px)
 */

const emptyStateVariants = cva('text-center', {
  variants: {
    variant: {
      default: 'p-12',
      compact: 'p-4',
      table: 'px-6 py-16',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const iconContainerVariants = cva(
  'rounded-full flex items-center justify-center mx-auto',
  {
    variants: {
      variant: {
        default: 'size-container-2xl mb-6',
        compact: 'size-container-lg mb-3',
        table: 'size-container-lg mb-4',
      },
      iconColor: {
        muted: 'bg-muted',
        primary: 'bg-primary/10',
        error: 'bg-error/10',
      },
    },
    defaultVariants: {
      variant: 'default',
      iconColor: 'muted',
    },
  }
);

const ICON_TEXT_COLORS = {
  muted: 'text-foreground-tertiary',
  primary: 'text-primary',
  error: 'text-error',
} as const;

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Icon color scheme */
  iconColor?: 'muted' | 'primary' | 'error';
  /** Main title */
  title: string;
  /** Supporting description */
  description?: string;
  /** Primary action */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Secondary action (link style) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant = 'default',
      icon,
      iconColor = 'muted',
      title,
      description,
      action,
      secondaryAction,
      ...props
    },
    ref
  ) => {
    const iconSize = variant === 'compact' || variant === 'table' ? 'size-icon-lg' : 'size-icon-2xl';

    return (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ variant }), className)}
        {...props}
      >
        {icon && (
          <div className={cn(iconContainerVariants({ variant, iconColor }))}>
            <div className={cn(iconSize, ICON_TEXT_COLORS[iconColor])}>
              {icon}
            </div>
          </div>
        )}
        <h3
          className={cn(
            'font-semibold text-foreground',
            variant === 'compact' || variant === 'table' ? 'text-sm mb-1' : 'text-lg mb-2'
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              'text-foreground-secondary max-w-sm mx-auto',
              variant === 'compact' || variant === 'table' ? 'text-sm' : 'text-sm mb-6'
            )}
          >
            {description}
          </p>
        )}
        {action && variant !== 'compact' && (
          <Button onClick={action.onClick} className="mt-6">
            {action.icon}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className={cn(
              'text-sm text-primary font-medium hover:underline cursor-pointer',
              variant === 'compact' ? 'mt-2 block' : 'mt-4 block'
            )}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';

/**
 * Pre-configured Empty State variants
 */

/** Generic no data state */
export const NoData = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, 'icon' | 'title'> & { title?: string }
>(({ title = 'No data available', ...props }, ref) => (
  <EmptyState
    ref={ref}
    icon={<Inbox className="w-full h-full" />}
    iconColor="muted"
    title={title}
    description="There's nothing here yet. Start by adding your first item."
    {...props}
  />
));
NoData.displayName = 'NoData';

/** No search results state */
export interface NoSearchResultsProps
  extends Omit<EmptyStateProps, 'icon' | 'title' | 'description'> {
  searchTerm?: string;
  onClear?: () => void;
}

export const NoSearchResults = React.forwardRef<
  HTMLDivElement,
  NoSearchResultsProps
>(({ searchTerm, onClear, ...props }, ref) => (
  <EmptyState
    ref={ref}
    icon={<Search className="w-full h-full" />}
    iconColor="muted"
    title="No results found"
    description={
      searchTerm
        ? `We couldn't find anything matching "${searchTerm}". Try different keywords.`
        : "We couldn't find any matches. Try different keywords."
    }
    secondaryAction={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
    {...props}
  />
));
NoSearchResults.displayName = 'NoSearchResults';

/** No customers state */
export const NoCustomers = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, 'icon' | 'title'>
>(({ ...props }, ref) => (
  <EmptyState
    ref={ref}
    icon={<Users className="w-full h-full" />}
    iconColor="primary"
    title="No customers yet"
    description="Your customer list is empty. Add your first customer to get started with lead management."
    {...props}
  />
));
NoCustomers.displayName = 'NoCustomers';

/** Error state */
export interface ErrorStateProps
  extends Omit<EmptyStateProps, 'icon' | 'title' | 'iconColor'> {
  title?: string;
  onRetry?: () => void;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ title = 'Failed to load data', onRetry, ...props }, ref) => (
    <EmptyState
      ref={ref}
      icon={<AlertTriangle className="w-full h-full" />}
      iconColor="error"
      title={title}
      description="Something went wrong while loading the data. Please try again."
      action={
        onRetry
          ? {
              label: 'Retry',
              onClick: onRetry,
              icon: <RefreshCw className="size-icon-sm" />,
            }
          : undefined
      }
      {...props}
    />
  )
);
ErrorState.displayName = 'ErrorState';

/** Table empty state - compact for use inside tables */
export const TableEmpty = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, 'icon' | 'variant'> & { icon?: React.ReactNode }
>(({ icon, ...props }, ref) => (
  <EmptyState
    ref={ref}
    variant="table"
    icon={icon || <Inbox className="w-full h-full" />}
    iconColor="muted"
    {...props}
  />
));
TableEmpty.displayName = 'TableEmpty';

/** Compact no quotes state */
export const NoQuotes = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, 'icon' | 'title' | 'variant'>
>(({ ...props }, ref) => (
  <EmptyState
    ref={ref}
    variant="compact"
    icon={<FileText className="w-full h-full" />}
    iconColor="muted"
    title="No quotes for this customer"
    {...props}
  />
));
NoQuotes.displayName = 'NoQuotes';

export { EmptyState, emptyStateVariants };
