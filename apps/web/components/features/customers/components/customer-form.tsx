'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerStatus, LeadSource } from '@tejas96/shared/types';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { useCreateCustomer, useCheckAvailability } from '../hooks/use-create-customer';
import {
  useCustomer,
  useUpdateCustomer,
  useUpdateCustomerStatus,
  useCustomerGroups,
  type Customer,
  type CustomerGroup,
} from '../hooks/use-customers';
import {
  createCustomerProfileSchema,
  type CreateCustomerProfileFormData,
} from '../schemas/customer.schema';

import { EmptyState } from '@/components/shared';
import { Button, Card, CardContent, MUIInput, MUISelect, showToast } from '@/components/ui';
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
  groups: CustomerGroup[];
}

// ============================================================================
// Constants
// ============================================================================

const INDIAN_STATES_AND_UTS = ['Karnataka', 'Maharashtra'];

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

const KNOWN_LEAD_SOURCE_VALUES = new Set<string>(Object.values(LeadSource));

// ============================================================================
// Helpers
// ============================================================================

/** Strip +91 prefix from phone number for display */
const stripPhonePrefix = (phone?: string): string => phone?.replace(/^\+91/, '') ?? '';

/** Return true when the given string matches a known LeadSource enum value */
function isKnownLeadSource(value?: string | null): boolean {
  return !!value && KNOWN_LEAD_SOURCE_VALUES.has(value);
}

/**
 * Given a raw leadSource value stored in DB, return the form state:
 * - If it matches a known enum → { leadSource: enumValue, leadSourceOther: '' }
 * - If it doesn't (custom text) → { leadSource: 'other', leadSourceOther: storedValue }
 */
function resolveLeadSourceForForm(raw?: string | null): {
  leadSource: string;
  leadSourceOther: string;
} {
  if (!raw) return { leadSource: '', leadSourceOther: '' };
  if (isKnownLeadSource(raw)) return { leadSource: raw, leadSourceOther: '' };
  return { leadSource: LeadSource.OTHER, leadSourceOther: raw };
}

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
            <div className="grid grid-cols-3 gap-4">
              <div className="h-14 bg-muted rounded animate-pulse" />
              <div className="h-14 bg-muted rounded animate-pulse" />
              <div className="h-14 bg-muted rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-14 bg-muted rounded animate-pulse" />
              <div className="h-14 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-14 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Inner Form Component - Only rendered when data is ready
// ============================================================================

function CustomerFormContent({
  mode,
  customerId,
  customer,
  groups,
}: CustomerFormContentProps): JSX.Element {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  // Hooks for mutations
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const updateCustomerStatus = useUpdateCustomerStatus();
  const availability = useCheckAvailability();

  // Compute default values
  const defaultLeadSource = resolveLeadSourceForForm(customer?.leadSource);

  const defaultFormValues: CreateCustomerProfileFormData =
    isEditMode && customer
      ? {
          firstName: customer.firstName,
          middleName: customer.middleName ?? '',
          lastName: customer.lastName ?? '',
          phone: stripPhonePrefix(customer.phone),
          email: customer.email ?? '',
          alternatePhone: stripPhonePrefix(customer.alternatePhone),
          address: customer.address ?? '',
          city: customer.city ?? '',
          state: customer.state ?? '',
          pincode: customer.pincode ?? '',
          leadSource: defaultLeadSource.leadSource,
          leadSourceOther: defaultLeadSource.leadSourceOther,
          referralCode: customer.referralCode ?? '',
          status: customer.status,
          groupCode: customer.groupCode ?? '',
          groupName: customer.groupName ?? '',
        }
      : {
          firstName: '',
          middleName: '',
          lastName: '',
          phone: '',
          email: '',
          alternatePhone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          leadSource: '',
          leadSourceOther: '',
          referralCode: '',
          status: undefined,
          groupCode: '',
          groupName: '',
        };

  const form = useForm<CreateCustomerProfileFormData>({
    resolver: zodResolver(createCustomerProfileSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });

  const watchedLeadSource = form.watch('leadSource');
  const watchedGroupCode = form.watch('groupCode');
  const showOtherSourceInput = watchedLeadSource === LeadSource.OTHER;

  // Group options for autocomplete
  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        label: `${g.groupName} (${g.groupCode})`,
        value: g.groupCode,
        groupName: g.groupName,
        groupCode: g.groupCode,
      })),
    [groups],
  );

  // Check phone availability on blur
  const handlePhoneBlur = (): void => {
    const phone = form.getValues('phone');
    if (phone.length === 10) {
      availability.checkPhone(phone, isEditMode ? customerId : undefined);
    }
  };

  // Check email availability on blur
  const handleEmailBlur = (): void => {
    const email = form.getValues('email');
    if (email) {
      availability.checkEmail(email, isEditMode ? customerId : undefined);
    }
  };

  const onSubmit = async (data: CreateCustomerProfileFormData): Promise<void> => {
    if (availability.hasErrors) {
      showToast.error('Please fix the duplicate phone/email errors');
      return;
    }

    try {
      if (isEditMode && customerId) {
        const { status, leadSourceOther, groupCode, groupName, ...profileFields } = data;

        // Resolve leadSource for update
        const resolvedLeadSource =
          data.leadSource === LeadSource.OTHER
            ? (leadSourceOther ?? undefined)
            : (data.leadSource ?? undefined);

        const updatePayload = {
          ...profileFields,
          phone: `+91${data.phone}`,
          // null = explicitly clear; undefined = omit (not changed) — we use null when user clears
          email: profileFields.email?.trim() ? profileFields.email.trim().toLowerCase() : null,
          alternatePhone: data.alternatePhone ? `+91${data.alternatePhone}` : null,
          leadSource: resolvedLeadSource,
          // Send null to explicitly clear group; omit entirely when no group was ever set
          groupCode: groupCode || (customer?.groupCode ? null : undefined),
          groupName: groupName || (customer?.groupName ? null : undefined),
        };

        await updateCustomer.mutateAsync({ id: customerId, data: updatePayload });
        if (status && status !== customer?.status) {
          await updateCustomerStatus.mutateAsync({ id: customerId, status });
        }
        showToast.success('Customer updated successfully');
      } else {
        await createCustomer.mutateAsync(data);
        showToast.success('Customer created successfully');
      }
      router.push(ROUTES.CUSTOMERS.LIST);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string }; status?: number } };
      const isOrgIdError =
        axiosErr.response?.status === 400 &&
        axiosErr.response.data?.message?.includes('organizationId');

      if (isOrgIdError) {
        showToast.error('Your account is not assigned to an organization. Please contact support.');
      } else {
        showToast.error(getErrorMessage(error));
      }
    }
  };

  const handleCancel = (): void => {
    router.push(ROUTES.CUSTOMERS.LIST);
  };

  const isSubmitting =
    createCustomer.isPending || updateCustomer.isPending || updateCustomerStatus.isPending;

  const phoneError =
    form.formState.errors.phone?.message ?? availability.state.phoneError ?? undefined;
  const alternatePhoneError = form.formState.errors.alternatePhone?.message;
  const emailError =
    form.formState.errors.email?.message ?? availability.state.emailError ?? undefined;

  const pageTitle = isEditMode ? 'Edit Customer' : 'Create New Customer';
  const pageDescription = isEditMode
    ? `Update details for ${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim()
    : 'Add a new customer to your database';

  const isLeadSourceLocked = isEditMode && !!customer?.leadSource;
  const isLeadSourceOtherDisabled = isLeadSourceLocked && !!defaultFormValues.leadSourceOther;

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
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Personal Information
              </h3>

              {/* Name row — 3 columns on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MUIInput
                  id="firstName"
                  fieldLabel="First Name"
                  required
                  placeholder="Enter first name"
                  error={form.formState.errors.firstName?.message}
                  {...form.register('firstName')}
                />
                <MUIInput
                  id="middleName"
                  fieldLabel="Middle Name"
                  required
                  placeholder="Enter middle name"
                  error={form.formState.errors.middleName?.message}
                  {...form.register('middleName')}
                />
                <MUIInput
                  id="lastName"
                  fieldLabel="Last Name"
                  required
                  placeholder="Enter last name"
                  error={form.formState.errors.lastName?.message}
                  {...form.register('lastName')}
                />
              </div>

              {/* Phone row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MUIInput
                  id="phone"
                  fieldLabel="Phone Number(whatsapp)"
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  error={phoneError}
                  loading={availability.state.isCheckingPhone || undefined}
                  startIcon={<span className="text-sm text-foreground-secondary">+91</span>}
                  inputProps={{ maxLength: 10 }}
                  {...form.register('phone', { onBlur: handlePhoneBlur })}
                />
                <MUIInput
                  id="alternatePhone"
                  fieldLabel="Alternate Phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  error={alternatePhoneError}
                  startIcon={<span className="text-sm text-foreground-secondary">+91</span>}
                  inputProps={{ maxLength: 10 }}
                  {...form.register('alternatePhone')}
                />
              </div>

              {/* Email */}
              <MUIInput
                id="email"
                fieldLabel="Email Address"
                type="email"
                placeholder="customer@email.com"
                error={emailError}
                loading={availability.state.isCheckingEmail || undefined}
                {...form.register('email', { onBlur: handleEmailBlur })}
              />
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Address
              </h3>

              <MUIInput
                id="address"
                fieldLabel="Street Address"
                placeholder="Enter street address"
                error={form.formState.errors.address?.message}
                {...form.register('address')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MUIInput
                  id="city"
                  fieldLabel="City"
                  required
                  placeholder="Enter city"
                  error={form.formState.errors.city?.message}
                  {...form.register('city')}
                />
                <Controller
                  name="state"
                  control={form.control}
                  render={({ field }) => (
                    <MUISelect
                      fieldLabel="State"
                      required
                      placeholder="Select state..."
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      error={form.formState.errors.state?.message}
                      options={INDIAN_STATES_AND_UTS.map((s) => ({ value: s, label: s }))}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MUIInput
                  id="pincode"
                  fieldLabel="Pincode"
                  required
                  placeholder="123456"
                  inputMode="numeric"
                  error={form.formState.errors.pincode?.message}
                  inputProps={{ maxLength: 6 }}
                  {...form.register('pincode')}
                />
                <MUIInput id="country" fieldLabel="Country" value="India" disabled />
              </div>
            </div>

            {/* Source Tracking Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Source Tracking
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Controller
                    name="leadSource"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Lead Source"
                        placeholder="Select source..."
                        value={field.value ?? ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          // Clear other-source text when switching away from "other"
                          if (e.target.value !== LeadSource.OTHER) {
                            form.setValue('leadSourceOther', '');
                          }
                        }}
                        disabled={isLeadSourceLocked}
                        error={form.formState.errors.leadSource?.message}
                        options={LEAD_SOURCE_OPTIONS}
                      />
                    )}
                  />
                  {/* Conditional "Specify Source" input when "Other" is selected */}
                  {showOtherSourceInput && (
                    <MUIInput
                      id="leadSourceOther"
                      fieldLabel="Specify Source"
                      required
                      placeholder="e.g. Newspaper, Radio"
                      disabled={isLeadSourceOtherDisabled}
                      error={form.formState.errors.leadSourceOther?.message}
                      inputProps={{ maxLength: 50 }}
                      {...form.register('leadSourceOther')}
                    />
                  )}
                </div>
                <MUIInput
                  id="referralCode"
                  fieldLabel="Referral Code"
                  placeholder="Enter referral code"
                  disabled={isEditMode && !!customer?.referralCode}
                  {...form.register('referralCode')}
                />
              </div>
            </div>

            {/* Customer Group Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                Customer Group
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  name="groupName"
                  control={form.control}
                  render={({ field }) => {
                    const selectedOption =
                      groupOptions.find((g) => g.groupCode === watchedGroupCode) ??
                      (field.value
                        ? { label: field.value, value: '', groupName: field.value, groupCode: '' }
                        : null);

                    const setGroup = (code: string, name: string): void => {
                      form.setValue('groupCode', code);
                      form.setValue('groupName', name);
                    };

                    return (
                      <MUIInput
                        mode="autocomplete"
                        fieldLabel="Customer Group"
                        tooltip="Optional. Select an existing group or type a new name to create one."
                        freeSolo
                        options={groupOptions}
                        value={selectedOption}
                        filterOptions={(opts, { inputValue }) => {
                          type O = {
                            label?: string;
                            groupName?: string;
                            groupCode?: string;
                            value?: string;
                          };
                          const q = inputValue.trim().toLowerCase();
                          const matches = (opts as O[]).filter((o) =>
                            (o.label ?? '').toLowerCase().includes(q),
                          );
                          const hasExact = (opts as O[]).some(
                            (o) => (o.label ?? '').toLowerCase() === q,
                          );
                          if (q && !hasExact) {
                            matches.push({
                              label: `Create "${inputValue.trim()}"`,
                              value: '',
                              groupName: inputValue.trim(),
                              groupCode: '',
                            });
                          }
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                          return matches as typeof opts;
                        }}
                        onInputChange={(text) => {
                          if (!groupOptions.find((g) => g.label === text)) {
                            setGroup('', text);
                          }
                        }}
                        onChange={(selected) => {
                          if (!selected) {
                            setGroup('', '');
                          } else if (typeof selected === 'string') {
                            setGroup('', selected);
                          } else {
                            const opt = selected as { groupCode: string; groupName: string };
                            setGroup(opt.groupCode, opt.groupName);
                          }
                        }}
                        getOptionLabel={(opt) =>
                          typeof opt === 'string'
                            ? opt
                            : String((opt as { label?: string }).label ?? '')
                        }
                        isOptionEqualToValue={(option, val) => {
                          if (typeof option === 'string' || typeof val === 'string')
                            return option === val;
                          return (
                            (option as { value?: string }).value ===
                            (val as { value?: string }).value
                          );
                        }}
                        noOptionsText="Type a name to create a new group"
                        clearable
                        onClear={() => setGroup('', '')}
                        textFieldProps={{ placeholder: 'Search or create a group...' }}
                      />
                    );
                  }}
                />
              </div>
            </div>

            {/* Status Section - Edit Mode Only */}
            {isEditMode && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
                  Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Customer Status"
                        placeholder="Select status..."
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={STATUS_OPTIONS}
                      />
                    )}
                  />
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

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useCustomer(customerId ?? '');

  const { data: groups = [] } = useCustomerGroups();

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

  if (isEditMode && (isLoadingCustomer || !customer)) {
    return <CustomerFormSkeleton />;
  }

  return (
    <CustomerFormContent
      key={isEditMode ? `edit-${customer?.id}` : 'create'}
      mode={mode}
      customerId={customerId}
      customer={customer}
      groups={groups}
    />
  );
}
