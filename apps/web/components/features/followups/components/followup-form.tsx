'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FollowupType, FollowupPriority, PropertyType } from '@oneohm-epc/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useCreateFollowup } from '../hooks';
import { followupSchema, type FollowupFormData } from '../schemas/followup.schema';

/** Input type for the form (before Zod defaults are applied) */
type FollowupFormInput = {
  propertyId: string;
  type: FollowupFormData['type'];
  subject: string;
  scheduledDate: Date;
  scheduledTime?: string;
  priority?: FollowupFormData['priority'];
  notes?: string;
  assignedToUserId?: string;
};

import { useCustomersList, useCustomerProperties } from '@/components/features/properties/hooks';
import { CustomerSearchCombobox, PropertySelector, RadioCard, RadioCardGroup } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  showToast,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface FollowupFormProps {
  followupId?: string;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

// ============================================================================
// Constants
// ============================================================================

const FOLLOWUP_TYPES = [
  { value: FollowupType.VISIT, title: 'Site Visit', icon: '🏠' },
  { value: FollowupType.MEETING, title: 'Meeting', icon: '👥' },
  { value: FollowupType.TASK, title: 'Task', icon: '✅' },
  { value: FollowupType.REMINDER, title: 'Reminder', icon: '⏰' },
  { value: FollowupType.DOCUMENT_COLLECTION, title: 'Document Collection', icon: '📄' },
];

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

// ============================================================================
// Component
// ============================================================================

export function FollowupForm({ followupId }: FollowupFormProps = {}): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('propertyId');
  const preselectedCustomerId = searchParams.get('customerId');
  const isEditMode = Boolean(followupId);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Fetch customers list for the combobox
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomersList();

  const customers: CustomerOption[] = useMemo(() => {
    if (!customersData?.data) return [];
    return customersData.data.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName ?? '',
      phone: c.phone,
      email: c.email,
    }));
  }, [customersData]);

  // Fetch properties for the selected customer
  const { data: customerProperties } = useCustomerProperties(
    selectedCustomer?.id || preselectedCustomerId || '',
  );

  const properties = useMemo(() => {
    if (!customerProperties) return [];
    return customerProperties.map((p) => ({
      id: p.id,
      propertyName: p.propertyName ?? '',
      address: p.address ?? '',
      city: p.city ?? '',
      propertyType: p.propertyType as PropertyType,
    }));
  }, [customerProperties]);

  const createFollowup = useCreateFollowup();

  const form = useForm<FollowupFormInput, unknown, FollowupFormData>({
    resolver: zodResolver(followupSchema),
    defaultValues: {
      propertyId: preselectedPropertyId || '',
      type: undefined,
      subject: '',
      scheduledDate: undefined,
      scheduledTime: '10:00',
      priority: FollowupPriority.NORMAL,
      notes: '',
    },
  });

  // Auto-select customer if preselected
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0 && !selectedCustomer) {
      const found = customers.find((c) => c.id === preselectedCustomerId);
      if (found) {
        setSelectedCustomer(found);
      }
    }
  }, [preselectedCustomerId, customers, selectedCustomer]);

  const handleCustomerSelect = useCallback(
    (customer: CustomerOption | null) => {
      setSelectedCustomer(customer);
      form.setValue('propertyId', '');
    },
    [form],
  );

  const handleQuickDate = useCallback(
    (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      form.setValue('scheduledDate', date);
    },
    [form],
  );

  const onSubmit = useCallback(
    (data: FollowupFormData) => {
      const customerId = selectedCustomer?.id || preselectedCustomerId;
      if (!customerId) {
        showToast.error('Please select a customer');
        return;
      }

      const scheduledAt = data.scheduledDate
        ? new Date(
            `${data.scheduledDate.toISOString().split('T')[0]}T${data.scheduledTime || '10:00'}:00`,
          ).toISOString()
        : new Date().toISOString();

      createFollowup.mutate(
        {
          customerId,
          propertyId: data.propertyId || undefined,
          type: data.type,
          subject: data.subject,
          scheduledAt,
          assignedToUserId: data.assignedToUserId || '',
          priority: data.priority,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            showToast.success(
              isEditMode ? 'Follow-up updated successfully' : 'Follow-up scheduled successfully',
            );
            router.push(ROUTES.FOLLOWUPS.LIST);
          },
          onError: (err) => {
            showToast.error(getErrorMessage(err));
          },
        },
      );
    },
    [selectedCustomer, preselectedCustomerId, createFollowup, isEditMode, router],
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.FOLLOWUPS.LIST}>Follow-ups</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isEditMode ? 'Edit Follow-up' : 'New Follow-up'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Follow-up' : 'Schedule Follow-up'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            {/* Customer Selection */}
            {!preselectedPropertyId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <CustomerSearchCombobox
                    customers={customers}
                    value={selectedCustomer}
                    onSelect={handleCustomerSelect}
                    placeholder="Search customer..."
                    isLoading={isLoadingCustomers}
                  />
                </div>

                {/* Property Selection */}
                {properties.length > 0 && (
                  <div className="space-y-2">
                    <Label>Property *</Label>
                    <PropertySelector
                      properties={properties}
                      value={form.watch('propertyId')}
                      onSelect={(v) => form.setValue('propertyId', v)}
                    />
                    {form.formState.errors.propertyId && (
                      <p className="text-xs text-error">
                        {form.formState.errors.propertyId.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Type */}
            <div className="space-y-2">
              <Label>Type *</Label>
              <RadioCardGroup
                value={form.watch('type')}
                onValueChange={(v) => form.setValue('type', v as FollowupType)}
                orientation="horizontal"
                className="grid grid-cols-3 gap-3"
              >
                {FOLLOWUP_TYPES.map((type) => (
                  <RadioCard
                    key={type.value}
                    value={type.value}
                    title={`${type.icon} ${type.title}`}
                  />
                ))}
              </RadioCardGroup>
              {form.formState.errors.type && (
                <p className="text-xs text-error">{form.formState.errors.type.message}</p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g., Discuss quote pricing, Schedule site visit"
                {...form.register('subject')}
                error={!!form.formState.errors.subject}
                errorMessage={form.formState.errors.subject?.message}
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <div className="flex gap-2">
                  {QUICK_DATES.map((opt) => (
                    <Button
                      key={opt.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDate(opt.days)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <DatePicker
                    value={form.watch('scheduledDate')}
                    onChange={(date) => date && form.setValue('scheduledDate', date)}
                    placeholder="Select date"
                  />
                  {form.formState.errors.scheduledDate && (
                    <p className="text-xs text-error">
                      {form.formState.errors.scheduledDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Time *</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    {...form.register('scheduledTime')}
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(v) => form.setValue('priority', v as FollowupPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FollowupPriority.HIGH}>🔴 High</SelectItem>
                  <SelectItem value={FollowupPriority.NORMAL}>🟡 Normal</SelectItem>
                  <SelectItem value={FollowupPriority.LOW}>🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                {...form.register('notes')}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border-light">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(ROUTES.FOLLOWUPS.LIST)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || createFollowup.isPending}
              >
                {createFollowup.isPending ? 'Scheduling...' : 'Schedule Follow-up'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
