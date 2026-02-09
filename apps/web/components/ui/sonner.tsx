'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toast styling configuration per UX design
 * Reference: apps/ux/web/v2/components/toasts.html
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          // Default toast styling
          toast:
            'group toast group-[.toaster]:bg-gray-900 group-[.toaster]:text-white group-[.toaster]:border-none group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-white/80',
          actionButton:
            'group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:hover:bg-white/30 group-[.toast]:rounded group-[.toast]:text-sm group-[.toast]:font-medium',
          cancelButton:
            'group-[.toast]:bg-transparent group-[.toast]:text-white/60 group-[.toast]:hover:text-white',
          closeButton:
            'group-[.toast]:text-white/60 group-[.toast]:hover:text-white group-[.toast]:hover:bg-white/20',
          // Type-specific styling
          success:
            'group-[.toaster]:bg-success group-[.toaster]:text-success-foreground group-[.toaster]:border-none',
          error:
            'group-[.toaster]:bg-error group-[.toaster]:text-error-foreground group-[.toaster]:border-none',
          warning:
            'group-[.toaster]:bg-warning group-[.toaster]:text-warning-foreground group-[.toaster]:border-none',
          info: 'group-[.toaster]:bg-info group-[.toaster]:text-info-foreground group-[.toaster]:border-none',
        },
      }}
      {...props}
    />
  );
};

type ToastOptions = Parameters<typeof toast>[1];

/**
 * Toast helper functions with UX styling
 * Usage: showToast.success('Message'), showToast.error('Message'), etc.
 */
const showToast = {
  success: (message: string, options?: ToastOptions) => toast.success(message, options),
  error: (message: string, options?: ToastOptions) => toast.error(message, options),
  warning: (message: string, options?: ToastOptions) => toast.warning(message, options),
  info: (message: string, options?: ToastOptions) => toast.info(message, options),
  // Default toast
  message: (message: string, options?: ToastOptions) => toast(message, options),
  // Toast with undo action
  withUndo: (message: string, onUndo: () => void, options?: ToastOptions) =>
    toast(message, {
      ...options,
      action: {
        label: 'Undo',
        onClick: onUndo,
      },
    }),
  // Dismiss toast
  dismiss: toast.dismiss,
};

export { Toaster, showToast };
