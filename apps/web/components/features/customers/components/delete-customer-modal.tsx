'use client';

import * as React from 'react';

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

// ============================================================================
// Types
// ============================================================================

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
}

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
}: DeleteCustomerModalProps): React.JSX.Element {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!customer) return;
    
    setIsDeleting(true);
    // TODO: Phase 2 - API call
    console.log('Delete customer:', customer.id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    showToast.success('Customer deleted successfully');
    setIsDeleting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">
              {customer?.firstName} {customer?.lastName}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-foreground-secondary">
            This will permanently delete the customer and all associated data including
            properties, quotes, and site visits.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
