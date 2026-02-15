'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LeadSource } from '@oneohm-epc/shared-types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateCustomer, useCheckAvailability } from '../hooks/use-create-customer';
import {
  createCustomerProfileSchema,
  type CreateCustomerProfileFormData,
} from '../schemas/customer.schema';

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
  showToast,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const LEAD_SOURCE_OPTIONS = [
  { value: LeadSource.REFERRAL, label: 'Referral' },
  { value: LeadSource.WALK_IN, label: 'Walk-in' },
  { value: LeadSource.SOCIAL_MEDIA, label: 'Social Media' },
  { value: LeadSource.WEBSITE, label: 'Website' },
  { value: LeadSource.EXHIBITION, label: 'Exhibition' },
  { value: LeadSource.COLD_CALL, label: 'Cold Call' },
  { value: LeadSource.ADVERTISEMENT, label: 'Advertisement' },
  { value: LeadSource.RESELLER, label: 'Reseller' },
  { value: LeadSource.OTHER, label: 'Other' },
];

// ============================================================================
// Helpers
// ============================================================================

/** Strip non-digits and limit to specified length */
const sanitizeNumeric = (value: string, maxLength: number): string =>
  value.replace(/\D/g, '').slice(0, maxLength);

// ============================================================================
// Component
// ============================================================================

export function CreateCustomerForm(): React.JSX.Element {
  const router = useRouter();
  const createCustomer = useCreateCustomer();
  const availability = useCheckAvailability();

  const form = useForm<CreateCustomerProfileFormData>({
    resolver: zodResolver(createCustomerProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      leadSource: undefined,
      referralCode: '',
    },
    mode: 'onChange',
  });

  // Check phone availability on blur
  const handlePhoneBlur = (): void => {
    const phone = form.getValues('phone');
    if (phone?.length === 10) {
      availability.checkPhone(phone);
    }
  };

  // Check email availability on blur
  const handleEmailBlur = (): void => {
    const email = form.getValues('email');
    if (email) {
      availability.checkEmail(email);
    }
  };

  const onSubmit = async (data: CreateCustomerProfileFormData): Promise<void> => {
    // Prevent submit if availability errors exist
    if (availability.hasErrors) {
      showToast.error('Please fix the duplicate phone/email errors');
      return;
    }

    try {
      await createCustomer.mutateAsync(data);
      showToast.success('Customer created successfully');
      router.push(ROUTES.CUSTOMERS.LIST);
    } catch (error: unknown) {
      // Check if it's an organizationId error and provide helpful message
      const axiosErr = error as { response?: { data?: unknown; status?: number } };
      if (axiosErr?.response?.status === 400 && 
          typeof axiosErr?.response?.data === 'object' &&
          axiosErr?.response?.data !== null &&
          'message' in axiosErr.response.data &&
          String(axiosErr.response.data.message).includes('organizationId')) {
        showToast.error('Your account is not assigned to an organization. Please contact support.');
      } else {
        showToast.error(getErrorMessage(error));
      }
    }
  };

  const handleCancel = (): void => {
    router.push(ROUTES.CUSTOMERS.LIST);
  };

  const isSubmitting = createCustomer.isPending;

  // Combine form validation errors with availability errors
  const phoneError =
    form.formState.errors.phone?.message ?? availability.state.phoneError ?? undefined;
  const emailError =
    form.formState.errors.email?.message ?? availability.state.emailError ?? undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <Link
          href={ROUTES.CUSTOMERS.LIST}
          className="inline-flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="size-icon-sm" />
          Back to Customers
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Create New Customer</h1>
        <p className="text-foreground-secondary text-sm mt-1">
          Add a new customer to your database
        </p>
      </div>

      {/* Form Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-6"
          >
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Personal Information
              </h3>

              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">
                    First Name <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    {...form.register('firstName')}
                    error={!!form.formState.errors.firstName}
                    errorMessage={form.formState.errors.firstName?.message}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    {...form.register('lastName')}
                    error={!!form.formState.errors.lastName}
                    errorMessage={form.formState.errors.lastName?.message}
                  />
                </div>
              </div>

              {/* Phone row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone Number <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    prefix="+91"
                    placeholder="98765 43210"
                    value={form.watch('phone')}
                    onChange={(e) =>
                      form.setValue('phone', sanitizeNumeric(e.target.value, 10), {
                        shouldValidate: true,
                      })
                    }
                    onBlur={handlePhoneBlur}
                    error={!!phoneError}
                    errorMessage={phoneError}
                    suffix={availability.state.isCheckingPhone ? (
                      <Loader2 className="size-icon-sm animate-spin text-foreground-secondary" />
                    ) : undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    type="tel"
                    inputMode="numeric"
                    prefix="+91"
                    placeholder="98765 43210"
                    value={form.watch('alternatePhone') ?? ''}
                    onChange={(e) =>
                      form.setValue('alternatePhone', sanitizeNumeric(e.target.value, 10))
                    }
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email Address <span className="text-error">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@email.com"
                  {...form.register('email', {
                    onBlur: handleEmailBlur,
                  })}
                  error={!!emailError}
                  errorMessage={emailError}
                  suffix={availability.state.isCheckingEmail ? (
                    <Loader2 className="size-icon-sm animate-spin text-foreground-secondary" />
                  ) : undefined}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Address
              </h3>

              {/* Street Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">
                  Street Address <span className="text-error">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="Enter street address"
                  {...form.register('address')}
                  error={!!form.formState.errors.address}
                  errorMessage={form.formState.errors.address?.message}
                />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">
                    City <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...form.register('city')}
                    error={!!form.formState.errors.city}
                    errorMessage={form.formState.errors.city?.message}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">
                    State <span className="text-error">*</span>
                  </Label>
                  <Select
                    value={form.watch('state')}
                    onValueChange={(v) => form.setValue('state', v, { shouldValidate: true })}
                  >
                    <SelectTrigger
                      id="state"
                      className={form.formState.errors.state ? 'border-error' : ''}
                    >
                      <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.state && (
                    <p className="text-xs text-error mt-1">
                      {form.formState.errors.state.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Pincode & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">
                    Pincode <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    placeholder="123456"
                    inputMode="numeric"
                    value={form.watch('pincode')}
                    onChange={(e) =>
                      form.setValue('pincode', sanitizeNumeric(e.target.value, 6), {
                        shouldValidate: true,
                      })
                    }
                    error={!!form.formState.errors.pincode}
                    errorMessage={form.formState.errors.pincode?.message}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value="India"
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* Source Tracking Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Source Tracking
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Select
                    value={form.watch('leadSource') ?? ''}
                    onValueChange={(v) => form.setValue('leadSource', v as LeadSource)}
                  >
                    <SelectTrigger id="leadSource">
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referralCode">Referral Code</Label>
                  <Input
                    id="referralCode"
                    placeholder="Enter referral code"
                    {...form.register('referralCode')}
                  />
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border-light">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || availability.hasErrors}>
                {isSubmitting ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
