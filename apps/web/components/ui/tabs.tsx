'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Tabs Component - OneOhm Design System
 *
 * Variants:
 * - default: Pill-style tabs (bg-muted container)
 * - underline: Classic underline style tabs
 * - boxed: Bordered box style tabs
 *
 * Reference: apps/ux/web/v2/components/tabs.html
 */

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva('inline-flex items-center', {
  variants: {
    variant: {
      default: 'h-9 justify-center rounded-lg bg-muted p-1 text-foreground-secondary',
      underline: 'gap-4 border-b border-border-light',
      boxed: 'border border-border-light rounded-lg overflow-hidden',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  // Base styles
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: [
          'rounded-md px-3 py-1.5',
          'ring-offset-background',
          'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm',
          'data-[state=inactive]:hover:bg-muted/80 data-[state=inactive]:text-foreground-secondary',
        ],
        underline: [
          'px-1 py-4 -mb-px',
          'border-b-2 border-transparent',
          'data-[state=active]:border-primary data-[state=active]:text-primary',
          'data-[state=inactive]:text-foreground-secondary data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:border-border-medium',
        ],
        boxed: [
          'px-5 py-2',
          'border-r border-border-light last:border-r-0',
          'data-[state=active]:bg-primary data-[state=active]:text-white',
          'data-[state=inactive]:text-foreground-secondary data-[state=inactive]:hover:bg-muted',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Count badge color variants - module scope for performance */
const COUNT_COLORS = {
  primary: 'bg-primary text-white',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  muted: 'bg-muted text-foreground-secondary',
} as const;

export type CountVariant = keyof typeof COUNT_COLORS;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  /** Optional count badge */
  count?: number;
  /** Count badge variant */
  countVariant?: CountVariant;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, count, countVariant = 'primary', children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span
        className={cn(
          'ml-2 px-2 py-0.5 text-xs font-semibold rounded-full',
          COUNT_COLORS[countVariant],
        )}
      >
        {count}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

/**
 * VerticalTabs - Sidebar-style vertical tabs
 * Reference: apps/ux/web/v2/components/tabs.html - Vertical Tabs section
 */
const VerticalTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex flex-col space-y-1 w-48', className)}
    {...props}
  />
));
VerticalTabsList.displayName = 'VerticalTabsList';

const VerticalTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg',
      'transition-all duration-fast',
      'data-[state=active]:bg-primary data-[state=active]:text-white',
      'data-[state=inactive]:text-foreground-secondary data-[state=inactive]:hover:bg-muted',
      className,
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Trigger>
));
VerticalTabsTrigger.displayName = 'VerticalTabsTrigger';

const VerticalTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'flex-1 border-l border-border-light pl-8',
      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
VerticalTabsContent.displayName = 'VerticalTabsContent';

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  VerticalTabsList,
  VerticalTabsTrigger,
  VerticalTabsContent,
  tabsListVariants,
  tabsTriggerVariants,
};

// Types are already exported via interface declarations above
