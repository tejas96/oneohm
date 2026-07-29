'use client';

import { LeadSource } from '@tejas96/shared/types';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useCustomerLookup } from '../../../hooks';

import {
  useCheckAvailability,
  useCustomerGroups,
  type Customer,
} from '@/components/features/customers';
import { Alert } from '@/components/shared';
import { Button, MUIInput, MUISelect, MUITypography } from '@/components/ui';

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

interface Step1CustomerIdentityProps {
  isLocked: boolean;
  onUseExistingCustomer: (customer: Customer) => void;
  /**
   * The customer being edited, if any. Excluded from the duplicate checks so
   * their own phone/email never reads as "already taken".
   */
  excludeCustomerId?: string;
}

export function Step1CustomerIdentity({
  isLocked,
  onUseExistingCustomer,
  excludeCustomerId,
}: Step1CustomerIdentityProps): React.JSX.Element {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const availability = useCheckAvailability();
  const { data: groups = [] } = useCustomerGroups();

  const phone = (watch('customer.phone') as string | undefined) ?? '';
  const email = (watch('customer.email') as string | undefined) ?? '';
  const leadSource = watch('customer.leadSource') as string | undefined;
  const groupCode = watch('customer.groupCode') as string | undefined;
  const groupName = (watch('customer.groupName') as string | undefined) ?? '';

  // Full-record lookup — powers the "use that customer" jump. Separate from
  // useCheckAvailability, which only returns booleans/messages for the
  // blur-validation error.
  const { customer: matchedCustomer } = useCustomerLookup(phone, {
    enabled: phone.length === 10,
  });
  // Editing a customer must not flag that customer's own number.
  const dupCustomer =
    matchedCustomer && matchedCustomer.id !== excludeCustomerId ? matchedCustomer : undefined;

  const handlePhoneBlur = (): void => {
    if (phone.length === 10) availability.checkPhone(phone, excludeCustomerId);
  };
  const handleEmailBlur = (): void => {
    if (email) availability.checkEmail(email, excludeCustomerId);
  };

  const groupOptions = React.useMemo(
    () =>
      groups.map((g) => ({
        label: `${g.groupName} (${g.groupCode})`,
        value: g.groupCode,
        groupName: g.groupName,
        groupCode: g.groupCode,
      })),
    [groups],
  );

  const customerErrors = (errors.customer ?? {}) as Record<
    string,
    { message?: string } | undefined
  >;
  const phoneError = customerErrors.phone?.message ?? availability.state.phoneError ?? undefined;
  const emailError = customerErrors.email?.message ?? availability.state.emailError ?? undefined;

  const setGroup = (code: string, name: string): void => {
    setValue('customer.groupCode', code, { shouldDirty: true });
    setValue('customer.groupName', name, { shouldDirty: true });
  };

  return (
    <div className="space-y-5">
      {dupCustomer && !isLocked && (
        <Alert
          variant="warning"
          appearance="minimal"
          title="That number is already on a profile"
          actions={
            <Button size="sm" onClick={() => onUseExistingCustomer(dupCustomer)}>
              Use that customer
            </Button>
          }
        >
          {dupCustomer.firstName} {dupCustomer.lastName ?? ''} uses +91 {phone}. Add the new site to
          them instead of making a second profile.
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MUIInput
          fieldLabel="First Name"
          required
          disabled={isLocked}
          placeholder="Rajesh"
          size="small"
          {...register('customer.firstName')}
          error={customerErrors.firstName?.message}
        />
        <MUIInput
          fieldLabel="Middle Name"
          disabled={isLocked}
          placeholder="Kumar"
          size="small"
          {...register('customer.middleName')}
          error={customerErrors.middleName?.message}
        />
        <MUIInput
          fieldLabel="Last Name"
          required
          disabled={isLocked}
          placeholder="Deshpande"
          size="small"
          {...register('customer.lastName')}
          error={customerErrors.lastName?.message}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MUIInput
          fieldLabel="Phone (WhatsApp)"
          required
          disabled={isLocked}
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          startIcon={<span className="text-sm text-foreground-secondary">+91</span>}
          inputProps={{ maxLength: 10 }}
          loading={availability.state.isCheckingPhone || undefined}
          error={phoneError}
          {...register('customer.phone', { onBlur: handlePhoneBlur })}
        />
        <MUIInput
          fieldLabel="Alternate Phone"
          disabled={isLocked}
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          startIcon={<span className="text-sm text-foreground-secondary">+91</span>}
          inputProps={{ maxLength: 10 }}
          error={customerErrors.alternatePhone?.message}
          {...register('customer.alternatePhone')}
        />
      </div>

      <MUIInput
        fieldLabel="Email Address"
        disabled={isLocked}
        type="email"
        placeholder="name@email.com"
        loading={availability.state.isCheckingEmail || undefined}
        error={emailError}
        {...register('customer.email', { onBlur: handleEmailBlur })}
      />

      <hr className="border-border-light" />
      <MUITypography
        variant="timestamp"
        className="text-foreground-tertiary uppercase tracking-wide"
      >
        Where the lead came from
      </MUITypography>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Controller
            name="customer.leadSource"
            control={control}
            render={({ field }) => (
              <MUISelect
                fieldLabel="Lead Source"
                placeholder="Select source..."
                value={field.value ?? ''}
                disabled={isLocked}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  if (e.target.value !== LeadSource.OTHER) {
                    setValue('customer.leadSourceOther', '');
                  }
                }}
                error={customerErrors.leadSourceOther?.message}
                options={LEAD_SOURCE_OPTIONS}
              />
            )}
          />
          {leadSource === LeadSource.OTHER && (
            <MUIInput
              fieldLabel="Specify Source"
              required
              disabled={isLocked}
              placeholder="e.g. Newspaper, Radio"
              inputProps={{ maxLength: 50 }}
              error={customerErrors.leadSourceOther?.message}
              {...register('customer.leadSourceOther')}
            />
          )}
        </div>
        <MUIInput
          fieldLabel="Referral Code"
          disabled={isLocked}
          placeholder="Enter referral code"
          {...register('customer.referralCode')}
        />
      </div>

      <Controller
        name="customer.groupName"
        control={control}
        render={({ field }) => {
          const selectedOption =
            groupOptions.find((g) => g.groupCode === groupCode) ??
            (field.value
              ? { label: field.value, value: '', groupName: field.value, groupCode: '' }
              : null);

          return (
            <MUIInput
              mode="autocomplete"
              fieldLabel="Customer Group"
              tooltip="Optional — housing societies, dealers, chains"
              freeSolo
              disabled={isLocked}
              options={groupOptions}
              value={selectedOption}
              onInputChange={(text) => {
                if (!groupOptions.find((g) => g.label === text)) setGroup('', text);
              }}
              onChange={(selected) => {
                if (!selected) setGroup('', '');
                else if (typeof selected === 'string') setGroup('', selected);
                else {
                  const opt = selected as { groupCode: string; groupName: string };
                  setGroup(opt.groupCode, opt.groupName);
                }
              }}
              getOptionLabel={(opt) =>
                typeof opt === 'string' ? opt : String((opt as { label?: string }).label ?? '')
              }
              isOptionEqualToValue={(option, val) =>
                typeof option === 'object' &&
                typeof val === 'object' &&
                (option as { value?: string }).value === (val as { value?: string }).value
              }
              noOptionsText="Type a name to create a new group"
              clearable
              onClear={() => setGroup('', '')}
              textFieldProps={{ placeholder: 'Search or create a group...' }}
            />
          );
        }}
      />
      {groupName && !groupCode && (
        <MUITypography variant="timestamp" className="text-foreground-tertiary">
          &quot;{groupName}&quot; will be created as a new group.
        </MUITypography>
      )}
    </div>
  );
}
