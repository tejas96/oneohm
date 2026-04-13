'use client';

import { Box, Divider } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { NetMeteringAgreementFields } from '../../templates/net-metering-agreement.template';
import type { ReportFormProps } from '../../types/report.types';

import { MUIInput, MUITypography } from '@/components/ui';

const DEBOUNCE_MS = 300;

export function NetMeteringAgreementForm({
  fields,
  onChange,
  disabled,
}: ReportFormProps<NetMeteringAgreementFields>) {
  const { control, watch } = useForm<NetMeteringAgreementFields>({ defaultValues: fields });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const values = watch();
  const serialised = JSON.stringify(values);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChangeRef.current(values);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [serialised]); // serialised is a stable JSON snapshot — other deps are refs

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Agreement Date & Location ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Agreement Details
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Location (City)" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="day"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Day"
                placeholder="e.g. 15"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="month"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Month"
                placeholder="e.g. January"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Year"
                placeholder="e.g. 2024"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Consumer / First Party ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Eligible Consumer (First Party)
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="consumer_name"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Consumer Name" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="consumer_number"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Consumer Number" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="consumer_address"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Consumer Premises Address"
                  disabled={disabled}
                  size="small"
                  multiline
                  rows={2}
                />
              </Box>
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Licensee / Second Party ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Distribution Licensee (Second Party)
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
          <Controller
            name="licensee_address"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Licensee Registered Office Address"
                disabled={disabled}
                size="small"
                multiline
                rows={2}
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── System Details ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Solar PV System
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="installed_capacity_wp"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Installed Capacity (Wp)"
                placeholder="e.g. 3.4"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Signatories ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Signatories & Witnesses
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="witness_consumer_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Witness – Consumer Side (Name)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="witness_licensee_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Witness – MSEDCL Side (Name)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="signatory_consumer_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Signatory – Eligible Consumer (Shri.)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="signatory_licensee_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Signatory – MSEDCL (Shri.)"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>
    </Box>
  );
}
