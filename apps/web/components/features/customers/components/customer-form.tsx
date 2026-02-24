'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerStatus, LeadSource } from '@oneohm-epc/shared-types';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { useCreateCustomer, useCheckAvailability } from '../hooks/use-create-customer';
import { useCustomer, useUpdateCustomer, useUpdateCustomerStatus, type Customer } from '../hooks/use-customers';
import {
  createCustomerProfileSchema,
  type CreateCustomerProfileFormData,
} from '../schemas/customer.schema';

import { EmptyState } from '@/components/shared';
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
// Types
// ============================================================================

interface CustomerFormProps {
  mode: 'create' | 'edit';
  customerId?: string;
}

interface CustomerFormContentProps {
  mode: 'create' | 'edit';
  customerId?: string;
  customer?: Customer;
}

// ============================================================================
// Constants
// ============================================================================

const INDIAN_STATES_AND_UTS = [
  'Karnataka',
  'Maharashtra',
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

const STATUS_OPTIONS = [
  { value: CustomerStatus.LEAD, label: 'Lead' },
  { value: CustomerStatus.PROSPECT, label: 'Prospect' },
  { value: CustomerStatus.ACTIVE, label: 'Active' },
  { value: CustomerStatus.INACTIVE, label: 'Inactive' },
];

// ============================================================================
// Helpers
// ============================================================================

/** Filter input to only allow digits, preserving cursor position */
const handleNumericInput = (
  e: React.FormEvent<HTMLInputElement>,
  maxLength: number
): void => {
  const input = e.currentTarget;
  const cursorPos = input.selectionStart ?? 0;
  const originalValue = input.value;
  const filtered = originalValue.replace(/\D/g, '').slice(0, maxLength);
  
  if (filtered !== originalValue) {
    input.value = filtered;
    // Calculate new cursor position (adjust for removed characters)
    const removedBefore = originalValue.slice(0, cursorPos).replace(/\D/g, '').length;
    requestAnimationFrame(() => {
      input.setSelectionRange(removedBefore, removedBefore);
    });
  }
};

/** Strip +91 prefix from phone number for display */
const stripPhonePrefix = (phone?: string): string =>
  phone?.replace(/^\+91/, '') ?? '';

// ============================================================================
// Loading Skeleton
// ============================================================================

function CustomerFormSkeleton(): JSX.Element {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-6">
          <div className="space-y-4">
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-input-lg bg-muted rounded animate-pulse" />
              <div className="h-input-lg bg-muted rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-input-lg bg-muted rounded animate-pulse" />
              <div className="h-input-lg bg-muted rounded animate-pulse" />
            </div>
            <div className="h-input-lg bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-input-lg bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-input-lg bg-muted rounded animate-pulse" />
              <div className="h-input-lg bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Inner Form Component - Only rendered when data is ready
// ============================================================================

function CustomerFormContent({ mode, customerId, customer }: CustomerFormContentProps): JSX.Element {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  // Hooks for mutations
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const updateCustomerStatus = useUpdateCustomerStatus();
  const availability = useCheckAvailability();

  // Compute default values - customer is guaranteed to be available in edit mode
  const defaultFormValues: CreateCustomerProfileFormData = isEditMode && customer
    ? {
        firstName: customer.firstName,
        lastName: customer.lastName ?? '',
        phone: stripPhonePrefix(customer.phone),
        email: customer.email ?? '',
        alternatePhone: stripPhonePrefix(customer.alternatePhone),
        address: customer.address ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        pincode: customer.pincode ?? '',
        leadSource: customer.leadSource ? (customer.leadSource as LeadSource) : undefined,
        referralCode: customer.referralCode ?? '',
        status: customer.status,
      }
    : {
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
        status: undefined,
      };

  const form = useForm<CreateCustomerProfileFormData>({
    resolver: zodResolver(createCustomerProfileSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });

  // Check phone availability on blur (exclude current customer in edit mode)
  const handlePhoneBlur = (): void => {
    const phone = form.getValues('phone');
    if (phone.length === 10) {
      availability.checkPhone(phone, isEditMode ? customerId : undefined);
    }
  };

  // Check email availability on blur (exclude current customer in edit mode)
  const handleEmailBlur = (): void => {
    const email = form.getValues('email');
    if (email) {
      availability.checkEmail(email, isEditMode ? customerId : undefined);
    }
  };

  const onSubmit = async (data: CreateCustomerProfileFormData): Promise<void> => {
    // Prevent submit if availability errors exist
    if (availability.hasErrors) {
      showToast.error('Please fix the duplicate phone/email errors');
      return;
    }

    try {
      if (isEditMode && customerId) {
        const { status, ...profileFields } = data;
        const updatePayload = {
          ...profileFields,
          phone: `+91${data.phone}`,
          alternatePhone: data.alternatePhone ? `+91${data.alternatePhone}` : undefined,
          leadSource: data.leadSource ?? undefined,
        };
        await updateCustomer.mutateAsync({ id: customerId, data: updatePayload });
        if (status && status !== customer?.status) {
          await updateCustomerStatus.mutateAsync({ id: customerId, status });
        }
        showToast.success('Customer updated successfully');
      } else {
        // useCreateCustomer already adds +91 prefix
        await createCustomer.mutateAsync(data);
        showToast.success('Customer created successfully');
      }
      router.push(ROUTES.CUSTOMERS.LIST);
    } catch (error: unknown) {
      // Check if it's an organizationId error and provide helpful message
      const axiosErr = error as { response?: { data?: { message?: string }; status?: number } };
      const isOrgIdError =
        axiosErr.response?.status === 400 &&
        axiosErr.response.data?.message?.includes('organizationId');

      if (isOrgIdError) {
        showToast.error(
          'Your account is not assigned to an organization. Please contact support.'
        );
      } else {
        showToast.error(getErrorMessage(error));
      }
    }
  };

  const handleCancel = (): void => {
    router.push(ROUTES.CUSTOMERS.LIST);
  };

  const isSubmitting = createCustomer.isPending || updateCustomer.isPending || updateCustomerStatus.isPending;

  // Combine form validation errors with availability errors
  const phoneError =
    form.formState.errors.phone?.message ?? availability.state.phoneError ?? undefined;
  const emailError =
    form.formState.errors.email?.message ?? availability.state.emailError ?? undefined;

  // Page header text
  const pageTitle = isEditMode ? 'Edit Customer' : 'Create New Customer';
  const pageDescription = isEditMode
    ? `Update details for ${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim()
    : 'Add a new customer to your database';

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
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
        <p className="text-foreground-secondary text-sm mt-1">{pageDescription}</p>
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
                    maxLength={10}
                    {...form.register('phone')}
                    onInput={(e) => handleNumericInput(e, 10)}
                    onBlur={handlePhoneBlur}
                    error={!!phoneError}
                    errorMessage={phoneError}
                    suffix={
                      availability.state.isCheckingPhone ? (
                        <Loader2 className="size-icon-sm animate-spin text-foreground-secondary" />
                      ) : undefined
                    }
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
                    maxLength={10}
                    {...form.register('alternatePhone')}
                    onInput={(e) => handleNumericInput(e, 10)}
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
                  suffix={
                    availability.state.isCheckingEmail ? (
                      <Loader2 className="size-icon-sm animate-spin text-foreground-secondary" />
                    ) : undefined
                  }
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
                      {INDIAN_STATES_AND_UTS.map((state) => (
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
                    maxLength={6}
                    {...form.register('pincode')}
                    onInput={(e) => handleNumericInput(e, 6)}
                    error={!!form.formState.errors.pincode}
                    errorMessage={form.formState.errors.pincode?.message}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value="India" disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Source Tracking Section - disabled in edit mode (immutable) */}
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
                    disabled={isEditMode && !!customer?.leadSource}
                  >
                    <SelectTrigger id="leadSource" className={isEditMode && !!customer?.leadSource ? 'bg-muted' : ''}>
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
                    disabled={isEditMode && !!customer?.referralCode}
                    className={isEditMode && !!customer?.referralCode ? 'bg-muted' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Status Section - Only in Edit Mode, editable */}
            {isEditMode && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                  Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="status">Customer Status</Label>
                    <Select
                      value={form.watch('status') as string | undefined}
                      onValueChange={(v) =>
                        form.setValue('status', v as CustomerStatus, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border-light">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || availability.hasErrors}>
                {isSubmitting
                  ? isEditMode
                    ? 'Saving...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Save Changes'
                    : 'Create Customer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component - Handles data fetching and routing to inner form
// ============================================================================

export function CustomerForm({ mode, customerId }: CustomerFormProps): JSX.Element {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  // Fetch customer data for edit mode
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useCustomer(customerId ?? '');

  // Show error FIRST if customer not found in edit mode (check before loading)
  if (isEditMode && customerError) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={<AlertCircle className="size-icon-2xl" />}
          iconColor="error"
          title="Customer not found"
          description="The customer you're trying to edit doesn't exist or you don't have access."
          action={{
            label: 'Back to Customers',
            onClick: () => router.push(ROUTES.CUSTOMERS.LIST),
          }}
        />
      </div>
    );
  }

  // Show loading skeleton while fetching customer data in edit mode
  if (isEditMode && (isLoadingCustomer || !customer)) {
    return <CustomerFormSkeleton />;
  }

  // Render the form with customer data (guaranteed to be available in edit mode)
  return (
    <CustomerFormContent
      key={isEditMode ? `edit-${customer?.id}` : 'create'}
      mode={mode}
      customerId={customerId}
      customer={customer}
    />
  );
}
