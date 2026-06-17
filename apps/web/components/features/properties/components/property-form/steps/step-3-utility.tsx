'use client';

import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { Card, CardContent, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ConnectionType } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { PROPERTY_ALERTS } from '../../../constants';

import { Alert } from '@/components/shared';
import { MUIInput, MUITypography } from '@/components/ui';
import { CONNECTION_TYPE_OPTIONS, DISCOM_OPTIONS } from '@/lib/config/constants';

export function Step3Utility(): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const connectionType = watch('connectionType');

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <BoltOutlinedIcon fontSize="small" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <MUITypography variant="sectionTitle">Electricity Details</MUITypography>
              <Chip
                label="OPTIONAL"
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: 10 }}
              />
            </div>
            <MUITypography variant="body">Power connection and billing information</MUITypography>
          </div>
        </div>
        <CardContent className="p-5 space-y-5">
          <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.electricityTip.title}>
            {PROPERTY_ALERTS.electricityTip.message}
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MUIInput
              mode="select"
              fieldLabel="DISCOM Provider"
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
              fieldLabel="Consumer Number"
              id="consumerNumber"
              placeholder="Enter consumer number"
              size="small"
              {...register('consumerNumber')}
              error={errors.consumerNumber?.message as string | undefined}
            />
          </div>

          {/* Connection Type toggle */}
          <div>
            <MUITypography variant="bodyPrimary" className="font-medium mb-2 block">
              Connection Type
            </MUITypography>
            <ToggleButtonGroup
              value={connectionType ?? null}
              exclusive
              onChange={(_, val) => {
                if (val !== null) {
                  setValue('connectionType', val as ConnectionType, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              size="small"
              className="w-full"
            >
              {CONNECTION_TYPE_OPTIONS.map((type) => (
                <ToggleButton
                  key={type.value}
                  value={type.value}
                  className="w-1/2 flex flex-col gap-1 py-2"
                >
                  <MUITypography variant="bodyPrimary" className="font-medium">
                    {type.label}
                  </MUITypography>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    {type.value === ConnectionType.SINGLE_PHASE
                      ? 'Homes & small shops'
                      : 'Offices & factories'}
                  </MUITypography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {errors.connectionType && (
              <MUITypography variant="alertTitle" color="error" className="mt-1 block">
                {errors.connectionType.message as string}
              </MUITypography>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MUIInput
              fieldLabel="Sanctioned Load (kW)"
              id="sanctionedLoad"
              type="number"
              step="0.5"
              placeholder="e.g., 5"
              size="small"
              {...register('sanctionedLoad', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              error={errors.sanctionedLoad?.message as string | undefined}
            />

            <MUIInput
              fieldLabel="Meter Number"
              id="meterNumber"
              placeholder="Enter meter number"
              size="small"
              {...register('meterNumber')}
              error={errors.meterNumber?.message as string | undefined}
            />

            <MUIInput
              fieldLabel="Avg. Monthly Bill"
              id="monthlyBill"
              type="number"
              placeholder="e.g., 2500"
              size="small"
              startIcon={<CurrencyRupeeIcon sx={{ fontSize: 16 }} />}
              {...register('monthlyBill', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              error={errors.monthlyBill?.message as string | undefined}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
