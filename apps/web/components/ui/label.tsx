'use client';

import * as React from 'react';

import { cva, type VariantProps } from '@/lib/cva';
import { cn } from '@/lib/utils';

/**
 * Radix's Label only added implicit `htmlFor` association via its context,
 * which nothing here relied on — every call site passes `htmlFor` explicitly.
 * A native <label> is equivalent and drops the dependency.
 */
const labelVariants = cva(
  'text-xs font-medium leading-none text-foreground-secondary peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  /** Show red asterisk for required fields */
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label ref={ref} className={cn(labelVariants(), className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-error">*</span>}
    </label>
  ),
);
Label.displayName = 'Label';

export { Label, labelVariants };
