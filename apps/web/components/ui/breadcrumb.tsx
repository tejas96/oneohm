import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Breadcrumb Component
 * Navigation breadcrumbs with separator variants
 * 
 * Uses theme tokens:
 * - text-foreground-secondary for links
 * - text-foreground for current page
 * - text-foreground-tertiary for separators
 */

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode;
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = 'Breadcrumb';

export interface BreadcrumbListProps
  extends React.ComponentPropsWithoutRef<'ol'> {
  /** Visual variant */
  variant?: 'default' | 'contained';
}

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-sm text-foreground-secondary',
        variant === 'contained' && 'px-3 py-1.5 bg-background-tertiary rounded-lg',
        className
      )}
      {...props}
    />
  )
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

export interface BreadcrumbLinkProps
  extends React.ComponentPropsWithoutRef<'a'> {
  asChild?: boolean;
  /** Use primary color instead of gray */
  colored?: boolean;
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, className, colored, ...props }, ref) => {
    const Comp = asChild ? Slot : 'a';

    return (
      <Comp
        ref={ref}
        className={cn(
          'duration-fast transition-colors',
          colored
            ? 'text-primary hover:text-primary-dark font-medium'
            : 'hover:text-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-medium text-foreground', className)}
    {...props}
  />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

export interface BreadcrumbSeparatorProps extends React.ComponentProps<'li'> {
  /** Separator type */
  type?: 'chevron' | 'slash';
}

const BreadcrumbSeparator = ({
  children,
  className,
  type = 'chevron',
  ...props
}: BreadcrumbSeparatorProps) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('text-foreground-tertiary', className)}
    {...props}
  >
    {children ?? (type === 'slash' ? (
      <span className="mx-1">/</span>
    ) : (
      <ChevronRight className="w-4 h-4" />
    ))}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn(
      'flex h-8 w-8 items-center justify-center rounded cursor-pointer',
      'text-foreground-tertiary hover:bg-muted hover:text-foreground-secondary',
      'duration-fast transition-colors',
      className
    )}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

/**
 * BreadcrumbHome - Home icon for first breadcrumb item
 */
const BreadcrumbHome = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & { asChild?: boolean }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      ref={ref}
      className={cn(
        'text-foreground-secondary hover:text-foreground duration-fast transition-colors',
        className
      )}
      aria-label="Home"
      {...props}
    >
      <Home className="w-5 h-5" />
    </Comp>
  );
});
BreadcrumbHome.displayName = 'BreadcrumbHome';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  BreadcrumbHome,
};
