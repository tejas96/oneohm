'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PropertyType,
  ConnectionType,
  LeadTemperature,
  LeadSource,
} from '@oneohm-epc/shared-types';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import {
  createCustomerSchema,
  type CreateCustomerFormData,
} from '../schemas/customer.schema';

import { Stepper, RadioCard, RadioCardGroup } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
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

type WizardStep = 'customer' | 'property' | 'electricity' | 'lead' | 'review';

// ============================================================================
// Constants
// ============================================================================

const STEPS: { id: WizardStep; title: string }[] = [
  { id: 'customer', title: 'Customer Info' },
  { id: 'property', title: 'Property Details' },
  { id: 'electricity', title: 'Electricity Details' },
  { id: 'lead', title: 'Lead Status' },
  { id: 'review', title: 'Review' },
];

const PROPERTY_TYPES = [
  { value: PropertyType.RESIDENTIAL, title: 'Residential', description: 'House or villa' },
  { value: PropertyType.RESIDENTIAL_APARTMENT, title: 'Apartment', description: 'Flat in a building' },
  { value: PropertyType.COMMERCIAL, title: 'Commercial', description: 'Shop or office' },
  { value: PropertyType.INDUSTRIAL, title: 'Industrial', description: 'Factory or warehouse' },
];

const CONNECTION_TYPES = [
  { value: ConnectionType.SINGLE_PHASE, title: 'Single Phase', description: 'Up to 5 kW' },
  { value: ConnectionType.THREE_PHASE, title: 'Three Phase', description: 'Above 5 kW' },
];

const TEMPERATURE_OPTIONS = [
  { value: LeadTemperature.HOT, title: 'Hot', description: 'Ready to buy' },
  { value: LeadTemperature.WARM, title: 'Warm', description: 'Interested' },
  { value: LeadTemperature.COLD, title: 'Cold', description: 'Just exploring' },
];

// ============================================================================
// Component
// ============================================================================

export function CreateCustomerWizard(): React.JSX.Element {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<WizardStep>('customer');

  const form = useForm<CreateCustomerFormData>({
     
    resolver: zodResolver(createCustomerSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      alternatePhone: '',
      propertyName: '',
      propertyType: undefined,
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
      leadSource: undefined,
      notes: '',
      billingAddressSameAsProperty: true,
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingPincode: '',
    },
    mode: 'onChange',
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    const nextStep = STEPS[nextIndex];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    const prevStep = STEPS[prevIndex];
    if (prevStep) {
      setCurrentStep(prevStep.id);
    }
  };

  const canProceed = (): boolean => {
    const values = form.getValues();
    const errors = form.formState.errors;

    switch (currentStep) {
      case 'customer':
        return !!(values.firstName && values.phone && !errors.firstName && !errors.phone);
      case 'property':
        return !!(values.propertyName && values.propertyType && values.address && values.city && values.pincode);
      case 'electricity':
        return !!(values.discomName && values.connectionType && values.sanctionedLoad);
      case 'lead':
        return !!values.leadTemperature;
      default:
        return true;
    }
  };

  const onSubmit = (data: CreateCustomerFormData) => {
    // TODO: Phase 2 - API call
    console.log('Create customer:', data);
    showToast.success('Customer created successfully');
    router.push(ROUTES.CUSTOMERS.LIST);
  };

  const handleStepClick = (stepIndex: number) => {
    const step = STEPS[stepIndex];
    if (step && (stepIndex <= currentStepIndex || canProceed())) {
      setCurrentStep(step.id);
    }
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
            <BreadcrumbPage>New Customer</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Stepper */}
      <Stepper
        steps={STEPS.map(step => ({
          id: step.id,
          label: step.title,
        }))}
        currentStep={currentStepIndex}
        variant="horizontal"
        onStepClick={handleStepClick}
        allowClickPrevious
      />

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Customer Info */}
            {currentStep === 'customer' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Customer Information</h2>
                
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
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
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
                    placeholder="customer@email.com"
                    {...form.register('email')}
                    error={!!form.formState.errors.email}
                    errorMessage={form.formState.errors.email?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    type="tel"
                    {...form.register('alternatePhone')}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Property Details */}
            {currentStep === 'property' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Property Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property Name *</Label>
                  <Input
                    id="propertyName"
                    placeholder="e.g., Main Residence, Office Building"
                    {...form.register('propertyName')}
                    error={!!form.formState.errors.propertyName}
                    errorMessage={form.formState.errors.propertyName?.message}
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

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="Full address"
                    {...form.register('address')}
                    error={!!form.formState.errors.address}
                  />
                  {form.formState.errors.address && (
                    <p className="text-xs text-error">{form.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      {...form.register('city')}
                      error={!!form.formState.errors.city}
                      errorMessage={form.formState.errors.city?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      {...form.register('state')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      maxLength={6}
                      {...form.register('pincode')}
                      error={!!form.formState.errors.pincode}
                      errorMessage={form.formState.errors.pincode?.message}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Electricity Details */}
            {currentStep === 'electricity' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Electricity Details</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consumerNumber">Consumer Number</Label>
                    <Input
                      id="consumerNumber"
                      {...form.register('consumerNumber')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meterNumber">Meter Number</Label>
                    <Input
                      id="meterNumber"
                      {...form.register('meterNumber')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discomName">DISCOM Name *</Label>
                  <Input
                    id="discomName"
                    placeholder="e.g., MSEDCL, TATA Power"
                    {...form.register('discomName')}
                    error={!!form.formState.errors.discomName}
                    errorMessage={form.formState.errors.discomName?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Connection Type *</Label>
                  <RadioCardGroup
                    value={form.watch('connectionType')}
                    onValueChange={(v) => form.setValue('connectionType', v as ConnectionType)}
                    orientation="horizontal"
                  >
                    {CONNECTION_TYPES.map(type => (
                      <RadioCard
                        key={type.value}
                        value={type.value}
                        title={type.title}
                        description={type.description}
                      />
                    ))}
                  </RadioCardGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sanctionedLoad">Sanctioned Load (kW) *</Label>
                    <Input
                      id="sanctionedLoad"
                      type="number"
                      step="0.1"
                      {...form.register('sanctionedLoad', { valueAsNumber: true })}
                      error={!!form.formState.errors.sanctionedLoad}
                      errorMessage={form.formState.errors.sanctionedLoad?.message}
                    />
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
              </div>
            )}

            {/* Step 4: Lead Status */}
            {currentStep === 'lead' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Lead Status</h2>

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

                <div className="space-y-2">
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Select
                    value={form.watch('leadSource')}
                    onValueChange={(v) => form.setValue('leadSource', v as LeadSource)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LeadSource.REFERRAL}>Referral</SelectItem>
                      <SelectItem value={LeadSource.WEBSITE}>Website</SelectItem>
                      <SelectItem value={LeadSource.SOCIAL_MEDIA}>Social Media</SelectItem>
                      <SelectItem value={LeadSource.EXHIBITION}>Exhibition</SelectItem>
                      <SelectItem value={LeadSource.WALK_IN}>Walk-in</SelectItem>
                      <SelectItem value={LeadSource.COLD_CALL}>Cold Call</SelectItem>
                      <SelectItem value={LeadSource.ADVERTISEMENT}>Advertisement</SelectItem>
                      <SelectItem value={LeadSource.RESELLER}>Reseller</SelectItem>
                      <SelectItem value={LeadSource.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Review & Submit</h2>

                {/* Summary sections */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground-secondary">Customer</h3>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{form.watch('firstName')} {form.watch('lastName')}</p>
                      <p className="text-sm text-foreground-secondary">{form.watch('phone')}</p>
                      <p className="text-sm text-foreground-secondary">{form.watch('email') || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground-secondary">Property</h3>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{form.watch('propertyName')}</p>
                      <p className="text-sm text-foreground-secondary">{form.watch('address')}</p>
                      <p className="text-sm text-foreground-secondary">{form.watch('city')}, {form.watch('pincode')}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground-secondary">Electricity</h3>
                    <div className="space-y-1">
                      <p className="text-sm">{form.watch('discomName')}</p>
                      <p className="text-sm text-foreground-secondary">{form.watch('connectionType')} • {form.watch('sanctionedLoad')} kW</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground-secondary">Lead</h3>
                    <div className="space-y-1">
                      <p className="text-sm">Temperature: {form.watch('leadTemperature')}</p>
                      <p className="text-sm text-foreground-secondary">Loan Interest: {form.watch('wantsLoan') ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Billing address option */}
                <div className="border-t border-border-light pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="billingAddressSameAsProperty"
                      checked={form.watch('billingAddressSameAsProperty')}
                      onCheckedChange={(checked) => form.setValue('billingAddressSameAsProperty', checked === true)}
                    />
                    <Label htmlFor="billingAddressSameAsProperty" className="cursor-pointer">
                      Billing address same as property address
                    </Label>
                  </div>

                  {!form.watch('billingAddressSameAsProperty') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="billingAddress">Billing Address</Label>
                        <Input id="billingAddress" {...form.register('billingAddress')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billingCity">City</Label>
                        <Input id="billingCity" {...form.register('billingCity')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billingPincode">Pincode</Label>
                        <Input id="billingPincode" {...form.register('billingPincode')} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-light">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 'customer' ? () => router.push(ROUTES.CUSTOMERS.LIST) : goPrev}
              >
                {currentStep === 'customer' ? 'Cancel' : 'Previous'}
              </Button>

              {currentStep === 'review' ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating...' : 'Create Customer'}
                </Button>
              ) : (
                <Button type="button" onClick={goNext} disabled={!canProceed()}>
                  Next
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
