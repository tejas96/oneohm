'use client';

import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import { Card, CardContent, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { Controller } from 'react-hook-form';

import { GENDER_OPTIONS } from '../constants';
import type { UseProfileFormReturn } from '../hooks/use-profile-form';

import { Alert } from '@/components/shared';
import { Button, MUIDatePicker, MUIInput, MUISelect, MUITypography } from '@/components/ui';

// ── Types ──────────────────────────────────────────────────────

interface PersonalInfoSectionProps {
  personalForm: UseProfileFormReturn['personalForm'];
  isPersonalSubmitting: UseProfileFormReturn['isPersonalSubmitting'];
  personalError: UseProfileFormReturn['personalError'];
  onPersonalSubmit: UseProfileFormReturn['onPersonalSubmit'];
}

// ── Max date for date of birth (must be at least 18 years old) ─

const MAX_DOB = new Date();
MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 18);

// ── Component ──────────────────────────────────────────────────

export function PersonalInfoSection({
  personalForm,
  isPersonalSubmitting,
  personalError,
  onPersonalSubmit,
}: PersonalInfoSectionProps): JSX.Element {
  const { formState, register, control } = personalForm;
  const isDirty = formState.isDirty;

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PersonIcon sx={{ fontSize: 20 }} className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Personal Information</MUITypography>
          </div>

          {personalError ? (
            <Alert variant="error" appearance="minimal">
              {personalError}
            </Alert>
          ) : null}

          {/* Name row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MUIInput
              id="profile-first-name"
              fieldLabel="First Name"
              required
              error={formState.errors.firstName?.message}
              {...register('firstName')}
            />
            <MUIInput
              id="profile-last-name"
              fieldLabel="Last Name"
              error={formState.errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          {/* Phone row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MUIInput
              id="profile-phone"
              fieldLabel="Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              helperText={formState.errors.phone?.message ?? 'Must be unique across the platform'}
              error={formState.errors.phone?.message}
              {...register('phone')}
            />
            <MUIInput
              id="profile-alt-phone"
              fieldLabel="Alternate Phone"
              type="tel"
              placeholder="e.g. 9876543210"
              error={formState.errors.alternatePhone?.message}
              {...register('alternatePhone')}
            />
          </div>

          {/* DOB + Gender row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <MUIDatePicker
                  fieldLabel="Date of Birth"
                  value={field.value ?? null}
                  onChange={(date) => field.onChange(date)}
                  maxDate={MAX_DOB}
                  error={formState.errors.dateOfBirth?.message}
                />
              )}
            />
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <MUISelect
                  fieldLabel="Gender"
                  placeholder="Select gender"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || undefined)}
                  error={formState.errors.gender?.message}
                  options={GENDER_OPTIONS}
                />
              )}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              disabled={!isDirty || isPersonalSubmitting}
              onClick={(e) => void onPersonalSubmit(e)}
              className="min-w-28"
            >
              {isPersonalSubmitting ? (
                <CircularProgress size={16} className="mr-2" />
              ) : (
                <SaveIcon className="mr-2" sx={{ fontSize: 16 }} />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
