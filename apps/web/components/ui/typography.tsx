import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Typography Component - OneOhm V2 Design System
 *
 * Variants (per STYLE-GUIDE.md):
 * - Semantic: h1, h2, h3, h4, h5, h6, body, label, caption, link
 * - Form: helper (for helper text / descriptions under inputs)
 *
 * Sizes (per tailwind.config.ts):
 * - xs: 12px
 * - sm: 13px (default)
 * - base: 14px
 * - lg: 16px
 *
 * Colors (per tailwind.config.ts theme tokens):
 * - default, muted, primary, secondary, success, warning, error, info
 *
 * Error State:
 * - Use `error` prop (boolean) to toggle error styling
 * - Automatically applies error color and appropriate ARIA attributes
 *
 * @example
 * <Typography variant="h1">Page Title</Typography>
 * <Typography variant="body" size="sm">Body text</Typography>
 * <Typography variant="label" color="error">Error label</Typography>
 * <Typography variant="helper">Enter your email address</Typography>
 * <Typography variant="helper" error>This field is required</Typography>
 */
const typographyVariants = cva('', {
  variants: {
    /**
     * Semantic variant - determines the type/purpose of text
     * Uses theme tokens from tailwind.config.ts
     */
    variant: {
      // Headings - tracking-tight (per STYLE-GUIDE.md)
      h1: 'text-4xl font-semibold tracking-tight leading-snug',
      h2: 'text-2xl font-semibold tracking-tight leading-snug',
      h3: 'text-xl font-semibold tracking-tight leading-snug',
      h4: 'text-lg font-semibold tracking-tight leading-snug',
      h5: 'text-base font-semibold tracking-tight leading-snug',
      h6: 'text-sm font-semibold tracking-tight leading-snug',

      // Body - font-normal, default size 13px (per STYLE-GUIDE.md)
      body: 'text-sm font-normal leading-normal',

      // Label - font-medium, default size 12px (per STYLE-GUIDE.md)
      label: 'text-xs font-medium',

      // Caption - font-normal, smaller text (per STYLE-GUIDE.md text-[11px])
      caption: 'text-2xs font-normal',

      // Helper - for form field descriptions and hints (12px, tertiary color)
      helper: 'text-xs font-normal text-foreground-tertiary leading-normal',

      // Section header - uppercase, tracking-wide (per STYLE-GUIDE.md)
      section: 'text-section font-semibold uppercase tracking-wide',

      // Table header - uppercase (per STYLE-GUIDE.md)
      'table-header': 'text-2xs font-medium uppercase tracking-wide',

      // Link - underlined, default size 13px (per STYLE-GUIDE.md)
      link: 'text-sm underline underline-offset-2 cursor-pointer transition-colors hover:opacity-80',
    },

    /**
     * Size - uses fontSize tokens from tailwind.config.ts
     * Only applies when variant doesn't define its own size
     */
    size: {
      // 11px - badges, captions (per tailwind.config.ts text-2xs)
      xs: 'text-2xs',
      // 12px - labels, table headers (per tailwind.config.ts text-xs)
      sm: 'text-xs',
      // 13px - body text DEFAULT (per tailwind.config.ts text-sm)
      default: 'text-sm',
      // 14px - larger body (per tailwind.config.ts text-base)
      base: 'text-base',
      // 16px - section titles (per tailwind.config.ts text-lg)
      lg: 'text-lg',
    },

    /**
     * Color - uses semantic color tokens from tailwind.config.ts
     */
    color: {
      // Default foreground (theme: foreground.DEFAULT #18181b)
      default: 'text-foreground',
      // Secondary foreground (theme: foreground.secondary #52525b)
      secondary: 'text-foreground-secondary',
      // Muted foreground (theme: foreground.muted #a1a1aa)
      muted: 'text-foreground-muted',
      // Tertiary foreground (theme: foreground.tertiary #71717a)
      tertiary: 'text-foreground-tertiary',
      // Primary brand (theme: primary.DEFAULT #76c044)
      primary: 'text-primary',
      // Secondary brand (theme: secondary.DEFAULT #0d74b8)
      'secondary-brand': 'text-secondary',
      // Success (theme: success.DEFAULT #22c55e)
      success: 'text-success',
      // Warning (theme: warning.DEFAULT #eab308)
      warning: 'text-warning',
      // Error (theme: error.DEFAULT #dc2626)
      error: 'text-error',
      // Info (theme: info.DEFAULT #0ea5e9)
      info: 'text-info',
      // Inherit from parent
      inherit: 'text-inherit',
    },

    /**
     * Weight override - uses fontWeight tokens from tailwind.config.ts
     */
    weight: {
      // 300 - light
      light: 'font-light',
      // 400 - normal (body text, descriptions)
      normal: 'font-normal',
      // 500 - medium (labels, emphasis)
      medium: 'font-medium',
      // 600 - semibold (titles, section headers) - MAX per STYLE-GUIDE.md
      semibold: 'font-semibold',
    },

    /**
     * Text alignment
     */
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  compoundVariants: [
    // Body variant doesn't override size - allow size prop to work
    { variant: 'body', size: 'xs', class: 'text-2xs' },
    { variant: 'body', size: 'sm', class: 'text-xs' },
    { variant: 'body', size: 'default', class: 'text-sm' },
    { variant: 'body', size: 'base', class: 'text-base' },
    { variant: 'body', size: 'lg', class: 'text-lg' },
    // Label variant with size
    { variant: 'label', size: 'xs', class: 'text-2xs' },
    { variant: 'label', size: 'sm', class: 'text-xs' },
    { variant: 'label', size: 'default', class: 'text-xs' },
    { variant: 'label', size: 'base', class: 'text-sm' },
    { variant: 'label', size: 'lg', class: 'text-base' },
    // Link inherits size
    { variant: 'link', size: 'xs', class: 'text-2xs' },
    { variant: 'link', size: 'sm', class: 'text-xs' },
    { variant: 'link', size: 'default', class: 'text-sm' },
    { variant: 'link', size: 'base', class: 'text-base' },
    { variant: 'link', size: 'lg', class: 'text-lg' },
    // Helper variant with size
    { variant: 'helper', size: 'xs', class: 'text-2xs' },
    { variant: 'helper', size: 'sm', class: 'text-xs' },
    { variant: 'helper', size: 'default', class: 'text-xs' },
    { variant: 'helper', size: 'base', class: 'text-sm' },
    { variant: 'helper', size: 'lg', class: 'text-base' },
  ],
  defaultVariants: {
    variant: 'body',
    // NOTE: size is NOT set here to avoid overriding heading sizes
    // Headings (h1-h6) have their own font sizes defined in the variant
    color: 'default',
  },
});

type TypographyElement =
  | 'span'
  | 'p'
  | 'div'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'label'
  | 'strong'
  | 'em'
  | 'small'
  | 'a';

export interface TypographyProps
  extends
    Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyVariants> {
  /** Render as a different HTML element */
  as?: TypographyElement;
  /** Render as child component (using Radix Slot) */
  asChild?: boolean;
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Clamp text to N lines */
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  /** For htmlFor attribute when rendering as label */
  htmlFor?: string;
  /** Show error state - overrides color to error and adds aria-invalid */
  error?: boolean;
  /** ID of the form field this helper text describes (for aria-describedby) */
  describedBy?: string;
}

/**
 * Get the default HTML element based on variant
 */
function getDefaultElement(variant: string | null | undefined): TypographyElement {
  switch (variant) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'h5':
      return 'h5';
    case 'h6':
      return 'h6';
    case 'body':
      return 'p';
    case 'label':
      return 'label';
    case 'link':
      return 'a';
    case 'helper':
      return 'span';
    case null:
    case undefined:
    default:
      return 'span';
  }
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      className,
      as,
      asChild = false,
      variant,
      size,
      color,
      weight,
      align,
      truncate = false,
      lineClamp,
      error = false,
      describedBy,
      children,
      ...props
    },
    ref,
  ) => {
    const Tag = as || getDefaultElement(variant);
    const Comp = asChild ? Slot : Tag;

    // Determine the effective color - error prop overrides color
    const effectiveColor = error ? 'error' : color;

    // Build accessibility attributes for helper/error text
    const a11yProps: React.HTMLAttributes<HTMLElement> = {};
    if (variant === 'helper') {
      if (error) {
        a11yProps.role = 'alert';
        a11yProps['aria-live'] = 'polite';
      }
      if (describedBy) {
        a11yProps.id = describedBy;
      }
    }

    return (
      <Comp
        ref={ref as never}
        className={cn(
          typographyVariants({ variant, size, color: effectiveColor, weight, align }),
          // Override helper's default tertiary color when in error state
          error && variant === 'helper' && 'text-error',
          truncate && 'truncate',
          lineClamp === 1 && 'line-clamp-1',
          lineClamp === 2 && 'line-clamp-2',
          lineClamp === 3 && 'line-clamp-3',
          lineClamp === 4 && 'line-clamp-4',
          lineClamp === 5 && 'line-clamp-5',
          lineClamp === 6 && 'line-clamp-6',
          className,
        )}
        {...a11yProps}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Typography.displayName = 'Typography';

export { Typography };
