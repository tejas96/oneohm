'use client';

import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';
import { Card, CardContent, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { Controller } from 'react-hook-form';

import { COUNTRY_OPTIONS } from '../constants';
import type { UseProfileFormReturn } from '../hooks/use-profile-form';

import { Alert } from '@/components/shared';
import { Button, MUIInput, MUISelect, MUITypography } from '@/components/ui';

// ── Types ──────────────────────────────────────────────────────

interface AddressSectionProps {
  addressForm: UseProfileFormReturn['addressForm'];
  isAddressSubmitting: UseProfileFormReturn['isAddressSubmitting'];
  addressError: UseProfileFormReturn['addressError'];
  onAddressSubmit: UseProfileFormReturn['onAddressSubmit'];
}

// ── Component ──────────────────────────────────────────────────

export function AddressSection({
  addressForm,
  isAddressSubmitting,
  addressError,
  onAddressSubmit,
}: AddressSectionProps): JSX.Element {
  const { formState, register, control } = addressForm;
  const isDirty = formState.isDirty;

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LocationOnIcon sx={{ fontSize: 20 }} className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Address</MUITypography>
          </div>

          {addressError ? (
            <Alert variant="error" appearance="minimal">
              {addressError}
            </Alert>
          ) : null}

          {/* Street address — full width */}
          <MUIInput
            id="profile-address"
            fieldLabel="Street Address"
            multiline
            rows={2}
            error={formState.errors.address?.message}
            {...register('address')}
          />

          {/* City + State */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MUIInput
              id="profile-city"
              fieldLabel="City"
              error={formState.errors.city?.message}
              {...register('city')}
            />
            <MUIInput
              id="profile-state"
              fieldLabel="State / Province"
              error={formState.errors.state?.message}
              {...register('state')}
            />
          </div>

          {/* Country + Pincode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <MUISelect
                  fieldLabel="Country"
                  required
                  placeholder="Select country"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  error={formState.errors.country?.message}
                  options={COUNTRY_OPTIONS}
                />
              )}
            />
            <MUIInput
              id="profile-pincode"
              fieldLabel="PIN / Postal Code"
              error={formState.errors.pincode?.message}
              {...register('pincode')}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              disabled={!isDirty || isAddressSubmitting}
              onClick={(e) => void onAddressSubmit(e)}
              className="min-w-28"
            >
              {isAddressSubmitting ? (
                <CircularProgress size={16} className="mr-2" />
              ) : (
                <SaveIcon className="mr-2" sx={{ fontSize: 16 }} />
              )}
              Save Address
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
