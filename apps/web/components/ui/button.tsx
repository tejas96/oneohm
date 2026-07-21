import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import * as React from 'react';

import { color, shadow } from '@/lib/theme/tokens';
import { cn } from '@/lib/utils';

/**
 * Button — design-system adapter over MUI.
 *
 * Renders `@mui/material/Button` so it inherits the shared theme (pill
 * radius, white-on-green, `scale(0.97)` press, elevation ladder) rather
 * than maintaining a second, drifting button implementation. The public API
 * is unchanged from the previous CVA version, so its ~76 call sites did not
 * need touching.
 *
 * Was: Radix `Slot` + `class-variance-authority` + a hand-rolled Tailwind
 * variant map that disagreed with MUI's Button on height (28/32/36 vs 30)
 * and radius (8px vs 6px). Both now come from one place.
 *
 * ── Borders ───────────────────────────────────────────────────────────────
 * The DS has no outlined button. Hierarchy comes from luminance and
 * softness, never from lines, so its secondary action is a **white surface
 * carrying `e1`** — not a grey 1px rule. `variant="outline"` (the app's most
 * common, ~60 uses) therefore renders borderless, which is the single
 * biggest visual change in this file.
 *
 * ── Precedence ────────────────────────────────────────────────────────────
 * `sx` lands in `@layer mui`, consumer `className` in `@layer utilities`,
 * and utilities sort last — so a caller's Tailwind class still overrides
 * anything set here. That ordering is declared in `app/globals.css` and is
 * what makes this adapter safe to restyle without breaking call sites.
 */

const HEIGHT = { sm: 28, default: 32, lg: 36 } as const;

type Variant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'destructive-outline'
  | 'success'
  | 'warning'
  | 'outline'
  | 'ghost'
  | 'link';

type Size = 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

/** A solid fill: coloured background, white label, no resting shadow. */
const fill = (bg: string, hover: string, fg = '#ffffff') => ({
  backgroundColor: bg,
  color: fg,
  boxShadow: 'none',
  '&:hover': { backgroundColor: hover, boxShadow: shadow.e2 },
});

/**
 * The DS "secondary" gesture — a white surface that floats off the canvas on
 * `e1` and lifts to `e2` on hover. Used wherever the old design reached for
 * a border.
 */
const surface = (fg: string) => ({
  backgroundColor: color.surface,
  color: fg,
  boxShadow: shadow.e1,
  '&:hover': { backgroundColor: color.surface, boxShadow: shadow.e2 },
});

const VARIANT_SX: Record<Variant, Record<string, unknown>> = {
  /**
   * White label on brand green, per product direction.
   *
   * Note for whoever reads this later: white on #76C044 is 2.24:1, below the
   * WCAG AA 4.5:1 floor for normal text (dark ink would be 7.82:1). Kept white
   * deliberately as a brand decision. If accessibility is revisited, the
   * lowest-churn fix is darkening the fill to `--ds-primary-dark` (#4D7C0F),
   * which reaches 4.99:1 with white — but that also requires reworking the
   * hover tone, which is currently lighter than it.
   */
  default: {
    backgroundColor: color['action-primary'],
    color: color['primary-contrast'],
    boxShadow: 'none',
    '&:hover': { backgroundColor: color['action-primary-hover'], boxShadow: shadow.e2 },
  },
  secondary: fill(color.secondary, color['secondary-dark']),
  destructive: fill(color.danger, color['danger-hover']),
  success: fill(color['success-main'], color.success),
  // Warning is the one fill light enough to need dark ink (amber at 1.9:1
  // against white); `text-primary` on it reads 9.4:1.
  warning: fill(color['warning-main'], color.warning, color['text-primary']),
  outline: surface(color['text-secondary']),
  'destructive-outline': surface(color.danger),
  ghost: {
    backgroundColor: 'transparent',
    color: color['text-secondary'],
    boxShadow: 'none',
    '&:hover': { backgroundColor: color['neutral-bg'], boxShadow: 'none' },
  },
  link: {
    backgroundColor: 'transparent',
    color: color.link,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
    padding: 0,
    height: 'auto',
    minWidth: 0,
    boxShadow: 'none',
    '&:hover': { backgroundColor: 'transparent', color: color['link-hover'] },
  },
};

const sizeSx = (size: Size) => {
  if (size.startsWith('icon')) {
    const key = size === 'icon' ? 'default' : size === 'icon-sm' ? 'sm' : 'lg';
    const d = HEIGHT[key];
    return { height: d, width: d, minWidth: d, padding: 0 };
  }
  const h = HEIGHT[size as keyof typeof HEIGHT] ?? HEIGHT.default;
  return {
    height: h,
    fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
    padding: size === 'sm' ? '0 12px' : '0 16px',
  };
};

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: Variant;
  size?: Size;
  /** Buttons are already pill via the theme; kept for API compatibility. */
  pill?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  /** Merge props onto the single child element instead of rendering a button. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      fullWidth = false,
      asChild = false,
      loading = false,
      disabled,
      type,
      children,
      // `pill` is inert — every button is pill-shaped via the MUI theme.
      pill: _pill,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    /**
     * `asChild` (3 call sites, all wrapping a next/link `<Link>`) previously
     * needed Radix `Slot`. Cloning the child with merged props does the same
     * job for this use and drops the dependency.
     */
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(child, {
        ...props,
        className: cn(className, child.props.className as string | undefined),
        ref,
      });
    }

    return (
      <MuiButton
        ref={ref}
        className={className}
        disableElevation
        disableRipple
        fullWidth={fullWidth}
        disabled={isDisabled}
        type={type ?? 'button'}
        sx={{
          ...sizeSx(size),
          ...VARIANT_SX[variant],
          gap: 1,
          '&.Mui-disabled': {
            backgroundColor: variant === 'ghost' || variant === 'link' ? 'transparent' : undefined,
            opacity: 0.5,
          },
          '& svg': { width: size === 'sm' ? 14 : 16, height: size === 'sm' ? 14 : 16 },
        }}
        {...props}
      >
        {loading ? (
          <>
            <CircularProgress size={14} thickness={5} color="inherit" />
            <span className="sr-only">Loading</span>
            {children}
          </>
        ) : (
          children
        )}
      </MuiButton>
    );
  },
);
Button.displayName = 'Button';

export { Button };
