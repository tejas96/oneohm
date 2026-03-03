'use client';

import { type JSX } from 'react';

import { type Customer, useDeleteCustomer } from '../hooks';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  DialogDescription,
  showToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface DeleteCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

// ============================================================================
// Component
// ============================================================================

export function DeleteCustomerModal({
  open,
  onOpenChange,
  customer,
}: DeleteCustomerModalProps): JSX.Element {
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = async (): Promise<void> => {
    if (!customer) return;

    try {
      await deleteCustomer.mutateAsync(customer.id);
      showToast.success('Customer deleted successfully');
      onOpenChange(false);
    } catch (error: unknown) {
      showToast.error(getErrorMessage(error));
    }
  };

  const isDeleting = deleteCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">
              {customer?.firstName} {customer?.lastName || ''}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-foreground-secondary">
            This will permanently delete the customer and all associated data including properties,
            quotes, and site visits.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
