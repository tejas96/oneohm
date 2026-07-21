'use client';

import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import * as AccordionPrimitive from '@/lib/accordion';
import { cn } from '@/lib/utils';

/**
 * Accordion Component
 * Collapsible content panels with variant styles
 *
 * Uses theme tokens:
 * - border-border-light for borders
 * - hover:bg-muted for hover states
 * - text-foreground for titles
 * - text-foreground-secondary for content
 */

const Accordion = AccordionPrimitive.Root;

export interface AccordionItemProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  /** Visual variant */
  variant?: 'default' | 'flush' | 'separated';
}

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>(({ className, variant = 'default', ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      variant === 'default' && 'border-b border-border',
      variant === 'flush' && 'border-b border-border-light',
      variant === 'separated' && 'mb-3 border border-border-light rounded-lg overflow-hidden',
      className,
    )}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

export interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /** Optional icon to display before title */
  icon?: React.ReactNode;
  /** Optional description below title */
  description?: string;
}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, icon, description, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center gap-4 p-4 text-left',
        'text-sm font-medium text-foreground',
        'hover:bg-muted duration-fast transition-colors',
        '[&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="size-container-md rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
          {icon}
        </div>
      )}
      <div className="flex-1">
        {children}
        {description && (
          <p className="text-sm text-foreground-secondary font-normal mt-0.5">{description}</p>
        )}
      </div>
      <ChevronDown className="size-icon-md shrink-0 text-foreground-tertiary transition-transform duration-fast" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm text-foreground-secondary data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('px-4 pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
