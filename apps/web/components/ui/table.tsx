import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Table Component - OneOhm Design System
 *
 * Features:
 * - Theme dimensions: h-table-row, h-table-header, px-table-cell-x, py-table-cell-y
 * - Variants: default, striped, compact
 * - Hover states on rows
 * - Selection support (via data-state="selected")
 * - Sortable headers (use sortable prop)
 *
 * Reference: apps/ux/web/v2/components/tables.html
 */

const tableVariants = cva('w-full caption-bottom text-sm', {
  variants: {
    variant: {
      default: '',
      striped: '[&_tbody_tr:nth-child(even)]:bg-background-secondary',
      compact: '[&_td]:py-2 [&_th]:py-2',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn(tableVariants({ variant }), className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-background-secondary border-b border-border-light', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('divide-y divide-border-light', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-border-light bg-background-secondary font-medium [&>tr]:last:border-b-0',
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'min-h-table-row transition-colors duration-fast',
        'hover:bg-background-secondary',
        'data-[state=selected]:bg-primary/5',
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sorted, children, ...props }, ref) => {
    // Determine aria-sort value for accessibility
    const ariaSort = sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined;

    return (
      <th
        ref={ref}
        aria-sort={sortable ? ariaSort : undefined}
        className={cn(
          'h-table-header px-table-cell-x py-table-cell-y',
          'text-left align-middle text-2xs font-semibold text-foreground-secondary uppercase tracking-wider',
          '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
          sortable && 'cursor-pointer select-none hover:bg-muted',
          className,
        )}
        {...props}
      >
        {sortable ? (
          <div className="flex items-center gap-2">
            {children}
            <svg
              className={cn('size-icon-sm', sorted ? 'text-primary' : 'text-foreground-tertiary')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {sorted === 'asc' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              ) : sorted === 'desc' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              )}
            </svg>
          </div>
        ) : (
          children
        )}
      </th>
    );
  },
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-table-cell-x py-table-cell-y align-middle text-xs',
      '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-foreground-secondary', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableVariants,
};

// Types are already exported via interface declarations above
