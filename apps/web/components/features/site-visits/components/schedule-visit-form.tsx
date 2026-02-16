'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PropertyType } from '@oneohm-epc/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import {
  scheduleSiteVisitSchema,
  type ScheduleSiteVisitFormData,
  VISIT_TYPE_OPTIONS,
} from '../schemas/site-visit.schema';

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
  Switch,
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

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Property {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  propertyType: PropertyType;
}

interface Technician {
  id: string;
  name: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockCustomers: Customer[] = [
  { id: '1', firstName: 'Rajesh', lastName: 'Sharma', phone: '+91 98765 43210', email: 'rajesh@example.com' },
  { id: '2', firstName: 'Priya', lastName: 'Patel', phone: '+91 87654 32109', email: 'priya@example.com' },
];

const mockProperties: Property[] = [
  { id: 'p1', propertyName: 'Main Residence', address: '456 Green Valley', city: 'Pune', propertyType: PropertyType.RESIDENTIAL },
  { id: 'p2', propertyName: 'Office Building', address: '789 Business Park', city: 'Pune', propertyType: PropertyType.COMMERCIAL },
];

const mockTechnicians: Technician[] = [
  { id: 't1', name: 'Amit Kumar' },
  { id: 't2', name: 'Suresh Patil' },
  { id: 't3', name: 'Rahul Singh' },
];

// ============================================================================
// Component
// ============================================================================

export function ScheduleVisitForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('propertyId');

  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [properties, setProperties] = React.useState<Property[]>([]);

  const form = useForm<ScheduleSiteVisitFormData>({
     
    resolver: zodResolver(scheduleSiteVisitSchema) as any,
    defaultValues: {
      customerId: '',
      propertyId: preselectedPropertyId || '',
      visitType: undefined,
      assignedToUserId: '',
      scheduledDate: undefined,
      scheduledTime: '10:00',
      priority: 'normal',
      notes: '',
      sendSmsReminder: true,
    },
  });

  // When customer is selected, load their properties
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      form.setValue('customerId', customer.id);
      // TODO: Phase 2 - Fetch properties for customer
      setProperties(mockProperties);
    } else {
      setProperties([]);
    }
    form.setValue('propertyId', '');
  };

  const onSubmit = (data: ScheduleSiteVisitFormData) => {
    // TODO: Phase 2 - API call
    console.log('Schedule visit:', data);
    showToast.success('Site visit scheduled successfully');
    router.push(ROUTES.SITE_VISITS.LIST);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.SITE_VISITS.LIST}>Site Visits</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Schedule Visit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Site Visit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            {/* Customer & Property Selection */}
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

                {properties.length > 0 && (
                  <div className="space-y-2">
                    <Label>Property *</Label>
                    <PropertySelector
                      properties={properties as any}
                      value={form.watch('propertyId')}
                      onSelect={(v: string) => form.setValue('propertyId', v)}
                    />
                    {form.formState.errors.propertyId && (
                      <p className="text-xs text-error">{form.formState.errors.propertyId.message}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Visit Type */}
            <div className="space-y-2">
              <Label>Visit Type *</Label>
              <RadioCardGroup
                value={form.watch('visitType')}
                onValueChange={(v: string) => form.setValue('visitType', v as 'initial_assessment' | 'technical_survey' | 'follow_up')}
                orientation="horizontal"
              >
                {VISIT_TYPE_OPTIONS.map((type) => (
                  <RadioCard
                    key={type.value}
                    value={type.value}
                    title={type.label}
                    description={type.description}
                  />
                ))}
              </RadioCardGroup>
              {form.formState.errors.visitType && (
                <p className="text-xs text-error">{form.formState.errors.visitType.message}</p>
              )}
            </div>

            {/* Technician */}
            <div className="space-y-2">
              <Label>Assign Technician *</Label>
              <Select
                value={form.watch('assignedToUserId')}
                onValueChange={(v) => form.setValue('assignedToUserId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {mockTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.assignedToUserId && (
                <p className="text-xs text-error">{form.formState.errors.assignedToUserId.message}</p>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <DatePicker
                  value={form.watch('scheduledDate')}
                  onChange={(date: Date | undefined) => date && form.setValue('scheduledDate', date)}
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

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(v) => form.setValue('priority', v as 'high' | 'normal' | 'low')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="normal">🟡 Normal</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions for the technician..."
                {...form.register('notes')}
              />
            </div>

            {/* SMS Reminder */}
            <div className="flex items-center gap-3 py-2 px-4 bg-muted rounded-lg">
              <Switch
                id="sendSmsReminder"
                checked={form.watch('sendSmsReminder')}
                onCheckedChange={(checked) => form.setValue('sendSmsReminder', checked)}
              />
              <div>
                <Label htmlFor="sendSmsReminder" className="cursor-pointer">
                  Send SMS Reminder
                </Label>
                <p className="text-xs text-foreground-secondary">
                  Customer will receive reminder 24 hours before visit
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border-light">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(ROUTES.SITE_VISITS.LIST)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
