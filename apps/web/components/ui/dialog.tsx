'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, HelpCircle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import * as React from 'react';

import { Button } from './button';

import { cva, type VariantProps } from '@/lib/cva';
import { cn } from '@/lib/utils';

/**
 * Dialog Component - OneOhm Design System
 *
 * Layout structure (must follow this order):
 *   <DialogContent>
 *     <DialogHeader>        ← px-6 py-4, border-b, includes close button
 *       <DialogTitle />
 *       <DialogDescription /> (optional)
 *     </DialogHeader>
 *     <DialogBody>           ← p-6, scrollable content area
 *       ...
 *     </DialogBody>
 *     <DialogFooter>         ← px-6 py-4, border-t, bg-background-secondary
 *       ...buttons...
 *     </DialogFooter>
 *   </DialogContent>
 *
 * For forms that wrap DialogBody + DialogFooter, use DialogForm so the body
 * scrolls while the footer stays pinned:
 *   <DialogForm onSubmit={...}>
 *     <DialogBody>...</DialogBody>
 *     <DialogFooter>...</DialogFooter>
 *   </DialogForm>
 *
 * Sizes:
 * - sm: max-w-sm (small modals, confirmations)
 * - default: max-w-lg (standard modals)
 * - lg: max-w-2xl (larger forms)
 * - xl: max-w-4xl (complex content)
 * - full: max-w-[90vw] (near full-screen)
 *
 * Reference: apps/ux/web/v2/components/modals.html
 */

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // DS: overlays blur the layer behind and fade it toward WHITE — never
      // a dark scrim. 0.35 opacity, 8px blur, per the motion spec.
      'fixed inset-0 z-modal-backdrop bg-white/35 backdrop-blur-[8px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogContentVariants = cva(
  [
    'fixed left-[50%] top-[50%] z-modal',
    'flex flex-col w-full max-h-[calc(100vh-2rem)] overflow-hidden translate-x-[-50%] translate-y-[-50%]',
    // Borderless; `e5` is the modal step of the elevation ladder.
    'bg-background rounded-xl shadow-e5',
    'duration-normal',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
    'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** @deprecated Close button is now rendered inside DialogHeader. Use hideCloseButton on DialogHeader instead. */
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, size, hideCloseButton: _hideCloseButton, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  hideCloseButton?: boolean;
}

const DialogHeader = ({ className, hideCloseButton, children, ...props }: DialogHeaderProps) => (
  <div
    className={cn(
      'flex shrink-0 items-start justify-between gap-4 px-6 py-4 border-b border-border-light',
      className,
    )}
    {...props}
  >
    <div className="flex flex-col gap-1 flex-1 min-w-0">{children}</div>
    {!hideCloseButton && (
      <DialogPrimitive.Close className="shrink-0 p-1.5 -m-1.5 rounded-lg text-foreground-tertiary hover:text-foreground-secondary hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer">
        <X className="size-icon-md" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    )}
  </div>
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex shrink-0 items-center justify-end gap-3 px-6 py-4 border-t border-border-light bg-background-secondary rounded-b-lg',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto p-6', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

const DialogForm = ({ className, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)} {...props} />
);
DialogForm.displayName = 'DialogForm';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-foreground-secondary', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/**
 * ConfirmDialog - Pre-built confirmation dialog
 * Reference: apps/ux/web/v2/components/modals.html - Confirmation Modal
 */

/** Icon colors per variant - module scope for performance */
const ICON_COLORS = {
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
} as const;

/** Icon components per variant - using lucide-react */
const ICON_COMPONENTS = {
  info: HelpCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
} as const;

/** Button variant mapping for ConfirmDialog */
const CONFIRM_BUTTON_VARIANTS = {
  default: 'secondary',
  destructive: 'destructive',
  success: 'success',
  warning: 'warning',
} as const;

export type IconVariant = keyof typeof ICON_COLORS;
export type ConfirmButtonVariant = keyof typeof CONFIRM_BUTTON_VARIANTS;

export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
  iconVariant?: IconVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmVariant?: ConfirmButtonVariant;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  iconVariant = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'default',
}: ConfirmDialogProps) => {
  const IconComponent = ICON_COMPONENTS[iconVariant];
  const buttonVariant = CONFIRM_BUTTON_VARIANTS[confirmVariant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="text-center">
        <div className="p-6">
          <div
            className={cn(
              'size-container-xl rounded-full flex items-center justify-center mx-auto mb-4',
              ICON_COLORS[iconVariant],
            )}
          >
            {icon || <IconComponent className="size-icon-xl" />}
          </div>
          <DialogTitle className="mb-2">{title}</DialogTitle>
          <DialogDescription className="mb-6">{description}</DialogDescription>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onCancel?.();
                onOpenChange?.(false);
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={buttonVariant}
              className="flex-1"
              onClick={() => {
                onConfirm?.();
                onOpenChange?.(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogForm,
  DialogTitle,
  DialogDescription,
  ConfirmDialog,
  dialogContentVariants,
};

// Types are already exported via interface declarations above
