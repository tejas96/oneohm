'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FollowupType, FollowupPriority, PropertyType } from '@oneohm-epc/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { followupSchema, type FollowupFormData } from '../schemas/followup.schema';

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


// ============================================================================
// Types
// ============================================================================

interface FollowupFormProps {
  followupId?: string;
}

interface Property {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  propertyType: PropertyType;
}

interface Customer {
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
// Mock Data
// ============================================================================

const mockProperties: Property[] = [
  { id: 'p1', propertyName: 'Main Residence', address: '456 Green Valley', city: 'Pune', propertyType: PropertyType.RESIDENTIAL },
  { id: 'p2', propertyName: 'Office Building', address: '789 Business Park', city: 'Pune', propertyType: PropertyType.COMMERCIAL },
];

// ============================================================================
// Component
// ============================================================================

export function FollowupForm({ followupId }: FollowupFormProps = {}): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('propertyId');
  const isEditMode = Boolean(followupId);

  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [properties, setProperties] = React.useState<Property[]>([]);

  // Mock customers for search - TODO: Phase 2 - Fetch from API
  const mockCustomers: Customer[] = React.useMemo(() => [
    { id: '1', firstName: 'Rajesh', lastName: 'Sharma', phone: '+91 98765 43210', email: 'rajesh@example.com' },
    { id: '2', firstName: 'Priya', lastName: 'Patel', phone: '+91 87654 32109', email: 'priya@example.com' },
  ], []);

  const form = useForm<FollowupFormData>({
     
    resolver: zodResolver(followupSchema) as any,
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

  // When customer is selected, load their properties
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      // TODO: Phase 2 - Fetch properties for customer
      setProperties(mockProperties);
    } else {
      setProperties([]);
    }
    form.setValue('propertyId', '');
  };

  const handleQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    form.setValue('scheduledDate', date);
  };

  const onSubmit = (data: FollowupFormData) => {
    // TODO: Phase 2 - API call
    console.log(isEditMode ? 'Update followup:' : 'Create followup:', data);
    showToast.success(isEditMode ? 'Follow-up updated successfully' : 'Follow-up scheduled successfully');
    router.push(ROUTES.FOLLOWUPS.LIST);
  };

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Selection */}
            {!preselectedPropertyId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <CustomerSearchCombobox
                    customers={mockCustomers}
                    value={selectedCustomer}
                    onSelect={handleCustomerSelect}
                    placeholder="Search customer..."
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
                      <p className="text-xs text-error">{form.formState.errors.propertyId.message}</p>
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
                {FOLLOWUP_TYPES.map(type => (
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
                  {QUICK_DATES.map(opt => (
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
                    <p className="text-xs text-error">{form.formState.errors.scheduledDate.message}</p>
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
