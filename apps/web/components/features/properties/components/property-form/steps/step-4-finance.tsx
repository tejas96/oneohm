'use client';

import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined';
import { Card, CardContent } from '@mui/material';
import { LeadTemperature } from '@oneohm-epc/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { LeadTemperatureSelector } from '@/components/shared';
import { MUIInput, MUITypography } from '@/components/ui';

interface Step4FinanceProps {
  isSubmitting: boolean;
}

export function Step4Finance({ isSubmitting }: Step4FinanceProps): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const leadTemperature = watch('leadTemperature') as LeadTemperature | undefined;

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <DeviceThermostatOutlinedIcon fontSize="small" />
          </div>
          <div className="flex-1 min-w-0">
            <MUITypography variant="sectionTitle">Lead Status & Notes</MUITypography>
            <MUITypography variant="body">Interest level and additional comments</MUITypography>
          </div>
        </div>
        <CardContent className="p-5 space-y-5">
          <div>
            <MUITypography variant="bodyPrimary" className="font-medium mb-2 block">
              Lead Temperature{' '}
              <span className="text-error" aria-hidden="true">
                *
              </span>
            </MUITypography>
            <LeadTemperatureSelector
              value={leadTemperature}
              onChange={(v) =>
                setValue('leadTemperature', v, { shouldDirty: true, shouldValidate: true })
              }
              error={!!errors.leadTemperature}
              errorMessage={errors.leadTemperature?.message as string | undefined}
              disabled={isSubmitting}
            />
          </div>

          <MUIInput
            fieldLabel="Notes"
            id="notes"
            placeholder="Any additional notes about this lead..."
            size="small"
            multiline
            rows={3}
            {...register('notes')}
            error={errors.notes?.message as string | undefined}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
