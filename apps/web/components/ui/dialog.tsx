'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

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
 * DialogContent scrolls when tall; DialogHeader and DialogFooter are sticky so
 * action buttons stay reachable. For forms, wrap DialogBody + DialogFooter in
 * DialogForm:
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
    'flex flex-col w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain translate-x-[-50%] translate-y-[-50%]',
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

interface DialogContentProps
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
      'sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-border-light bg-background px-6 py-4',
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
      'sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 border-t border-border-light bg-background-secondary px-6 py-4 rounded-b-lg',
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

const DialogForm = ({ className, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form className={cn('flex flex-col', className)} {...props} />
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

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogForm,
  DialogTitle,
  DialogDescription,
};

// Types are already exported via interface declarations above
