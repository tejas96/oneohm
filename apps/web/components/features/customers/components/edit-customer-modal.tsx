'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { type Customer, useUpdateCustomer } from '../hooks';
import { editCustomerSchema, type EditCustomerFormData } from '../schemas/customer.schema';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

// ============================================================================
// Component
// ============================================================================

export function EditCustomerModal({
  open,
  onOpenChange,
  customer,
}: EditCustomerModalProps): JSX.Element {
  const updateCustomer = useUpdateCustomer();

  const form = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      status: customer?.status,
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName || '',
        phone: customer.phone,
        email: customer.email || '',
        status: customer.status,
      });
    }
  }, [customer, form]);

  const onSubmit = async (data: EditCustomerFormData): Promise<void> => {
    if (!customer) return;

    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: {
          firstName: data.firstName,
          lastName: data.lastName || undefined,
          phone: data.phone,
          email: data.email || undefined,
          status: data.status,
        },
      });
      showToast.success('Customer updated successfully');
      onOpenChange(false);
    } catch (error: unknown) {
      showToast.error(getErrorMessage(error));
    }
  };

  const isSubmitting = updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  error={!!form.formState.errors.firstName}
                  errorMessage={form.formState.errors.firstName?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  error={!!form.formState.errors.lastName}
                  errorMessage={form.formState.errors.lastName?.message}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register('phone')}
                error={!!form.formState.errors.phone}
                errorMessage={form.formState.errors.phone?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                error={!!form.formState.errors.email}
                errorMessage={form.formState.errors.email?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as CustomerStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CustomerStatus.LEAD}>Lead</SelectItem>
                  <SelectItem value={CustomerStatus.PROSPECT}>Prospect</SelectItem>
                  <SelectItem value={CustomerStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={CustomerStatus.INACTIVE}>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
