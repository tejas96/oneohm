'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PropertyType,
  ConnectionType,
  LeadTemperature,
} from '@oneohm-epc/shared-types';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { addPropertySchema, type AddPropertyFormData } from '../schemas/property.schema';

import { RadioCard, RadioCardGroup } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Switch,
  Checkbox,
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

interface AddPropertyFormProps {
  customerId: string;
}

// ============================================================================
// Constants
// ============================================================================

const PROPERTY_TYPES = [
  { value: PropertyType.RESIDENTIAL, title: 'Residential', description: 'House or villa' },
  { value: PropertyType.RESIDENTIAL_APARTMENT, title: 'Apartment', description: 'Flat in a building' },
  { value: PropertyType.COMMERCIAL, title: 'Commercial', description: 'Shop or office' },
  { value: PropertyType.INDUSTRIAL, title: 'Industrial', description: 'Factory or warehouse' },
];

const CONNECTION_TYPES = [
  { value: ConnectionType.SINGLE_PHASE, title: 'Single Phase' },
  { value: ConnectionType.THREE_PHASE, title: 'Three Phase' },
];

const TEMPERATURE_OPTIONS = [
  { value: LeadTemperature.HOT, title: 'Hot', description: 'Ready to buy' },
  { value: LeadTemperature.WARM, title: 'Warm', description: 'Interested' },
  { value: LeadTemperature.COLD, title: 'Cold', description: 'Just exploring' },
];

// ============================================================================
// Mock Customer Data
// ============================================================================

const mockCustomer = {
  id: '1',
  name: 'Rajesh Sharma',
  phone: '+91 98765 43210',
};

// ============================================================================
// Component
// ============================================================================

/**
 * @deprecated Use CreatePropertyForm instead which has full API integration
 */
export function AddPropertyForm({ customerId }: AddPropertyFormProps): React.JSX.Element {
  const router = useRouter();
  const customer = mockCustomer; // TODO: Phase 2 - Fetch by ID

  const form = useForm<AddPropertyFormData>({
    resolver: zodResolver(addPropertySchema),
    defaultValues: {
      propertyName: '',
      propertyType: undefined,
      isPrimary: false,
      address: '',
      city: '',
      state: '',
      pincode: '',
      consumerNumber: '',
      discomName: '',
      connectionType: undefined,
      sanctionedLoad: undefined,
      meterNumber: '',
      monthlyBill: undefined,
      leadTemperature: undefined,
      wantsLoan: false,
      notes: '',
    },
  });

  const onSubmit = (data: AddPropertyFormData) => {
    // TODO: Phase 2 - API call - use CreatePropertyForm instead
    void data; // Suppress unused warning
    showToast.success('Property added successfully');
    router.push(ROUTES.CUSTOMERS.DETAIL.replace('[id]', customerId));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.CUSTOMERS.LIST}>Customers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', customerId)}>
              {customer.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add Property</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Customer Context */}
      <Card variant="minimal">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {customer.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{customer.name}</p>
              <p className="text-xs text-foreground-secondary">{customer.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name *</Label>
              <Input
                id="propertyName"
                placeholder="e.g., Main Residence, Office Building"
                {...form.register('propertyName')}
                error={form.formState.errors.propertyName?.message}
              />
            </div>

            <div className="space-y-2">
              <Label>Property Type *</Label>
              <RadioCardGroup
                value={form.watch('propertyType')}
                onValueChange={(v) => form.setValue('propertyType', v as PropertyType)}
                orientation="horizontal"
              >
                {PROPERTY_TYPES.map(type => (
                  <RadioCard
                    key={type.value}
                    value={type.value}
                    title={type.title}
                    description={type.description}
                  />
                ))}
              </RadioCardGroup>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isPrimary"
                checked={form.watch('isPrimary')}
                onCheckedChange={(checked) => form.setValue('isPrimary', checked === true)}
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Set as primary property
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Full Address *</Label>
              <Textarea
                id="address"
                placeholder="Street address, area, landmark"
                {...form.register('address')}
                error={form.formState.errors.address?.message}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  error={form.formState.errors.city?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...form.register('state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  maxLength={6}
                  {...form.register('pincode')}
                  error={form.formState.errors.pincode?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Electricity Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Electricity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discomName">DISCOM Name *</Label>
                <Input
                  id="discomName"
                  placeholder="e.g., MSEDCL, TATA Power"
                  {...form.register('discomName')}
                  error={form.formState.errors.discomName?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerNumber">Consumer Number</Label>
                <Input id="consumerNumber" {...form.register('consumerNumber')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Connection Type *</Label>
              <RadioCardGroup
                value={form.watch('connectionType')}
                onValueChange={(v) => form.setValue('connectionType', v as ConnectionType)}
                orientation="horizontal"
              >
                {CONNECTION_TYPES.map(type => (
                  <RadioCard key={type.value} value={type.value} title={type.title} />
                ))}
              </RadioCardGroup>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sanctionedLoad">Sanctioned Load (kW) *</Label>
                <Input
                  id="sanctionedLoad"
                  type="number"
                  step="0.1"
                  {...form.register('sanctionedLoad', { valueAsNumber: true })}
                  error={form.formState.errors.sanctionedLoad?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meterNumber">Meter Number</Label>
                <Input id="meterNumber" {...form.register('meterNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyBill">Avg. Monthly Bill (₹)</Label>
                <Input
                  id="monthlyBill"
                  type="number"
                  {...form.register('monthlyBill', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Lead Temperature *</Label>
              <RadioCardGroup
                value={form.watch('leadTemperature')}
                onValueChange={(v) => form.setValue('leadTemperature', v as LeadTemperature)}
                orientation="horizontal"
              >
                {TEMPERATURE_OPTIONS.map(temp => (
                  <RadioCard
                    key={temp.value}
                    value={temp.value}
                    title={temp.title}
                    description={temp.description}
                  />
                ))}
              </RadioCardGroup>
            </div>

            <div className="flex items-center gap-3 py-2">
              <Switch
                id="wantsLoan"
                checked={form.watch('wantsLoan')}
                onCheckedChange={(checked) => form.setValue('wantsLoan', checked)}
              />
              <Label htmlFor="wantsLoan" className="cursor-pointer">
                Interested in financing / loan
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.CUSTOMERS.DETAIL.replace('[id]', customerId))}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Adding...' : 'Add Property'}
          </Button>
        </div>
      </form>
    </div>
  );
}
