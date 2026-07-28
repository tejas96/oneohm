'use client';

import { Box } from '@mui/material';
import { LeadTemperature } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { LeadTemperatureSelector } from '@/components/shared';
import { MUIFieldLabel, MUIInput } from '@/components/ui';
import { color } from '@/lib/theme/tokens';

/** Matches the `notes` cap in the shared property schema. */
const NOTES_MAX = 1000;

interface LeadFieldsProps {
  isSubmitting: boolean;
}

/** Lead temperature + notes. Card chrome is supplied by the wizard's StepCard. */
export function LeadFields({ isSubmitting }: LeadFieldsProps): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const leadTemperature = watch('leadTemperature') as LeadTemperature | undefined;
  const notes = (watch('notes') as string | undefined) ?? '';

  return (
    <div className="space-y-5">
      <Box>
        <MUIFieldLabel fieldLabel="Lead temperature" required />
        <Box sx={{ mt: 1 }}>
          <LeadTemperatureSelector
            value={leadTemperature}
            onChange={(v) =>
              setValue('leadTemperature', v, { shouldDirty: true, shouldValidate: true })
            }
            error={!!errors.leadTemperature}
            errorMessage={errors.leadTemperature?.message as string | undefined}
            disabled={isSubmitting}
          />
        </Box>
      </Box>

      <Box>
        <MUIInput
          fieldLabel="Notes from the call"
          id="notes"
          placeholder="Roof is accessible from the terrace. Wants to start before Diwali."
          size="small"
          multiline
          rows={3}
          inputProps={{ maxLength: NOTES_MAX }}
          {...register('notes')}
          error={errors.notes?.message as string | undefined}
          disabled={isSubmitting}
        />
        <Box
          sx={{
            fontSize: 12,
            color: notes.length >= NOTES_MAX ? color.danger : color['text-tertiary'],
            mt: 0.75,
            textAlign: 'right',
          }}
        >
          {notes.length} / {NOTES_MAX}
        </Box>
      </Box>
    </div>
  );
}
