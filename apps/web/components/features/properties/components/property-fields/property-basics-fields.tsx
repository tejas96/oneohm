'use client';

import { Box } from '@mui/material';
import { PropertyType } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { PROPERTY_ALERTS } from '../../constants';

import { SelectableChip } from '@/components/shared/forms';
import { MUIFieldLabel, MUIInput, MUISwitch } from '@/components/ui';
import { PROPERTY_TYPE_OPTIONS } from '@/lib/config/constants';
import { color, radius } from '@/lib/theme/tokens';

interface PropertyBasicsFieldsProps {
  /** Hides the "primary site" toggle — only meaningful while creating. */
  showIsPrimary?: boolean;
}

/**
 * Property name + type + primary toggle. Card chrome is supplied by the
 * wizard's StepCard.
 */
export function PropertyBasicsFields({
  showIsPrimary = false,
}: PropertyBasicsFieldsProps): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const propertyType = watch('propertyType') as string | undefined;
  const isPrimary = Boolean(watch('isPrimary'));

  return (
    <div className="space-y-5">
      <div>
        <MUIInput
          fieldLabel="Property name"
          required
          id="propertyName"
          placeholder="Deshpande residence"
          size="small"
          {...register('propertyName')}
          error={errors.propertyName?.message as string | undefined}
        />
        <Box sx={{ fontSize: 12, color: color['text-tertiary'], mt: 0.75, px: 0.5 }}>
          {PROPERTY_ALERTS.propertyTip.message}
        </Box>
      </div>

      <Box>
        <MUIFieldLabel fieldLabel="Property type" required />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {PROPERTY_TYPE_OPTIONS.map((type) => (
            <SelectableChip
              key={type.value}
              active={propertyType === type.value}
              onClick={() =>
                setValue('propertyType', type.value as PropertyType, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              {type.label}
            </SelectableChip>
          ))}
        </Box>
        {errors.propertyType && (
          <Box sx={{ fontSize: 12, color: color.danger, mt: 0.875 }}>
            {errors.propertyType.message as string}
          </Box>
        )}
      </Box>

      {showIsPrimary && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            p: '13px 15px',
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Primary site for this customer
            </Box>
            <Box sx={{ fontSize: 12.5, color: color['text-secondary'] }}>
              {isPrimary ? 'Shows first on the customer record' : 'Filed as an additional site'}
            </Box>
          </Box>
          {/* The switch renders as a bare input[role=switch] with no associated
              label, so assistive tech announced only "switch, unchecked" — the
              heading beside it is a plain Box, not a <label>. */}
          <MUISwitch
            id="isPrimary"
            aria-label="Primary site for this customer"
            checked={isPrimary}
            onCheckedChange={(checked) => setValue('isPrimary', checked, { shouldDirty: true })}
          />
        </Box>
      )}
    </div>
  );
}
