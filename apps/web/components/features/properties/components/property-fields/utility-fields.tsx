'use client';

import { ConnectionType } from '@tejas96/shared/types';
import { normalizeConsumerNumber } from '@tejas96/shared/utils';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useDiscomById, useDiscoms } from '../../hooks/use-discoms';

import { ConnectionTypeSelector } from '@/components/shared/forms';
import { MUIInput } from '@/components/ui';

/** DISCOM + consumer fields. Card chrome is supplied by the wizard's StepCard. */
export function UtilityFields(): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useFormContext();

  const { data: discoms = [], isLoading, isError } = useDiscoms();
  const discomId = watch('discomId') as string | undefined;
  const { data: selectedDiscomById } = useDiscomById(discomId);

  const discomOptions = React.useMemo(() => {
    const options = discoms.map((discom) => ({
      value: discom.id,
      label: discom.label,
    }));

    if (selectedDiscomById && !options.some((option) => option.value === selectedDiscomById.id)) {
      options.unshift({
        value: selectedDiscomById.id,
        label: selectedDiscomById.label,
      });
    }

    return options;
  }, [discoms, selectedDiscomById]);

  const selectedOption = React.useMemo(() => {
    if (!discomId) return null;
    return discomOptions.find((option) => option.value === discomId) ?? null;
  }, [discomId, discomOptions]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="discomId"
          control={control}
          render={({ field }) => (
            <MUIInput
              mode="autocomplete"
              fieldLabel="DISCOM"
              required
              options={discomOptions}
              value={selectedOption}
              onChange={(option) => {
                const nextValue =
                  option && typeof option === 'object' && 'value' in option
                    ? String(option.value)
                    : '';
                field.onChange(nextValue || undefined);
              }}
              loading={isLoading}
              noOptionsText={
                isError
                  ? 'Failed to load DISCOM list'
                  : isLoading
                    ? 'Loading DISCOM list…'
                    : 'No DISCOM available'
              }
              loadingText="Loading DISCOM list…"
              textFieldProps={{
                placeholder: 'Select DISCOM',
                error: !!errors.discomId,
                helperText: errors.discomId?.message as string | undefined,
              }}
            />
          )}
        />

        <MUIInput
          fieldLabel="Consumer name"
          required
          id="consumerName"
          placeholder="Name printed on the bill"
          size="small"
          {...register('consumerName')}
          error={errors.consumerName?.message as string | undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MUIInput
          fieldLabel="Consumer number"
          required
          id="consumerNumber"
          placeholder="10–12 digits"
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

        <MUIInput
          fieldLabel="Meter number"
          id="meterNumber"
          placeholder="MTR123456"
          size="small"
          {...register('meterNumber')}
          error={errors.meterNumber?.message as string | undefined}
        />
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MUIInput
          fieldLabel="Sanctioned load (kW)"
          id="sanctionedLoad"
          type="number"
          step="0.5"
          placeholder="5"
          size="small"
          {...register('sanctionedLoad', {
            setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
          })}
          error={errors.sanctionedLoad?.message as string | undefined}
        />

        <MUIInput
          fieldLabel="Current load"
          id="currentLoad"
          placeholder="e.g. 4.2 kW average"
          size="small"
          {...register('currentLoad')}
          error={errors.currentLoad?.message as string | undefined}
        />
      </div>
    </div>
  );
}
