'use client';

import { Toaster as Sonner, toast } from 'sonner';

import { color, radius, shadow } from '@/lib/theme/tokens';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * App-wide toast host. Mount exactly once, in `providers/index.tsx`.
 *
 * Previously this file exported a styled `Toaster` that was never mounted —
 * `providers/index.tsx` imported `Toaster` straight from `sonner` and
 * configured it inline, so every `classNames` rule here was dead code and
 * the two disagreed about position (`bottom-right` here, `top-right` there).
 * Styling now lives here and the provider just mounts it.
 *
 * `next-themes` used to drive a `theme` prop, but no `ThemeProvider` was ever
 * mounted, so `useTheme()` always returned the default. The design system is
 * light-only, so the dependency is gone and the theme is pinned.
 */
const Toaster = (props: ToasterProps): React.JSX.Element => (
  <Sonner
    theme="light"
    position="top-right"
    closeButton
    // Sonner's own semantic palette, which reads the CSS vars set below.
    richColors
    toastOptions={{
      duration: 4000,
      style: {
        fontFamily: 'var(--font-geist-sans)',
        // DS functional density: 12px card radius, e3 for a floating overlay.
        borderRadius: radius['rf-lg'],
        boxShadow: shadow.e3,
        // No structural borders — separation comes from luminance + shadow.
        border: 'none',
      },
    }}
    style={
      {
        '--normal-bg': color.surface,
        '--normal-text': color['text-primary'],
        '--success-bg': color['success-bg'],
        '--success-text': color.success,
        '--error-bg': color['danger-bg'],
        '--error-text': color.danger,
        '--warning-bg': color['warning-bg'],
        '--warning-text': color.warning,
        '--info-bg': color['info-bg'],
        '--info-text': color.info,
      } as React.CSSProperties
    }
    {...props}
  />
);

type ToastOptions = Parameters<typeof toast>[1];

/**
 * Toast helpers — the app-facing API, used by ~50 files.
 *
 * Deliberately a thin wrapper over `toast` rather than a re-export: it is the
 * seam that lets the underlying library be swapped (e.g. to MUI Snackbar)
 * without touching call sites.
 *
 * Usage: `showToast.success('Quote sent')`
 */
const showToast = {
  success: (message: string, options?: ToastOptions) => toast.success(message, options),
  error: (message: string, options?: ToastOptions) => toast.error(message, options),
  warning: (message: string, options?: ToastOptions) => toast.warning(message, options),
  info: (message: string, options?: ToastOptions) => toast.info(message, options),
  message: (message: string, options?: ToastOptions) => toast(message, options),
  withUndo: (message: string, onUndo: () => void, options?: ToastOptions) =>
    toast(message, {
      ...options,
      action: { label: 'Undo', onClick: onUndo },
    }),
  dismiss: toast.dismiss,
};

export { Toaster, showToast };
