'use client';

import { ConnectionType } from '@tejas96/shared/types';
import { normalizeConsumerNumber } from '@tejas96/shared/utils';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { ConnectionTypeSelector } from '@/components/shared/forms';
import { MUIInput, MUITypography } from '@/components/ui';
import { DISCOM_OPTIONS } from '@/lib/config/constants';

export function Step3Utility(): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <MUITypography variant="sectionTitle">Electricity Details</MUITypography>
        <MUITypography variant="body" className="mt-1 text-foreground-secondary">
          Provide your DISCOM connection information
        </MUITypography>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MUIInput
          mode="select"
          fieldLabel="DISCOM Provider"
          required
          id="discomName"
          size="small"
          value={(watch('discomName') as string) ?? ''}
          onChange={(e) =>
            setValue('discomName', e.target.value as string, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          options={DISCOM_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
          placeholder="Select DISCOM"
          error={errors.discomName?.message as string | undefined}
        />

        <MUIInput
          fieldLabel="Consumer Name"
          required
          id="consumerName"
          placeholder="Name on electricity bill"
          size="small"
          {...register('consumerName')}
          error={errors.consumerName?.message as string | undefined}
        />
      </div>

      <MUIInput
        fieldLabel="Consumer Number"
        required
        id="consumerNumber"
        placeholder="10–12 digit consumer number"
        size="small"
        inputMode="numeric"
        maxLength={12}
        {...register('consumerNumber', {
          onChange: (e) => {
            const normalized = normalizeConsumerNumber(e.target.value);
            if (normalized !== e.target.value) {
              setValue('consumerNumber', normalized, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
          },
        })}
        error={errors.consumerNumber?.message as string | undefined}
      />

      <Controller
        name="connectionType"
        control={control}
        render={({ field }) => (
          <ConnectionTypeSelector
            required
            value={(field.value as ConnectionType | undefined) ?? null}
            onChange={(val) => {
              field.onChange(val);
            }}
            error={errors.connectionType?.message as string | undefined}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MUIInput
          fieldLabel="Sanctioned Load (kW)"
          id="sanctionedLoad"
          type="number"
          step="0.5"
          placeholder="e.g. 5"
          size="small"
          {...register('sanctionedLoad', {
            setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
          })}
          error={errors.sanctionedLoad?.message as string | undefined}
        />

        <MUIInput
          fieldLabel="Current Load"
          id="currentLoad"
          placeholder="e.g. 5 KW"
          size="small"
          {...register('currentLoad')}
          error={errors.currentLoad?.message as string | undefined}
        />

        <MUIInput
          fieldLabel="Meter Number"
          id="meterNumber"
          placeholder="Enter meter number"
          size="small"
          {...register('meterNumber')}
          error={errors.meterNumber?.message as string | undefined}
        />
      </div>
    </div>
  );
}
