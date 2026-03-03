'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, HelpCircle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import * as React from 'react';

import { Button } from './button';

import { cn } from '@/lib/utils';

/**
 * Dialog Component - OneOhm Design System
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
      'fixed inset-0 z-modal-backdrop bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogContentVariants = cva(
  // Base styles
  [
    'fixed left-[50%] top-[50%] z-modal',
    'grid w-full translate-x-[-50%] translate-y-[-50%]',
    'bg-background rounded-lg border border-border-light shadow-xl',
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
  /** Hide the close button */
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, size, hideCloseButton, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 p-2 rounded-lg text-foreground-tertiary hover:text-foreground-secondary hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer">
          <X className="size-icon-md" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col gap-1 px-6 py-4 border-b border-border-light', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light bg-background-secondary rounded-b-lg',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

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
      <DialogContent size="sm" hideCloseButton className="text-center">
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
  DialogTitle,
  DialogDescription,
  ConfirmDialog,
  dialogContentVariants,
};

// Types are already exported via interface declarations above
