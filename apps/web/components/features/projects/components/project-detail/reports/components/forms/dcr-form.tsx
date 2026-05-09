'use client';

import { Box, Divider } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { DcrFields } from '../../templates/dcr.template';
import type { ReportFormProps } from '../../types/report.types';

import { MUIInput, MUITypography } from '@/components/ui';

const DEBOUNCE_MS = 300;

export function DcrForm({ fields, onChange, disabled }: ReportFormProps<DcrFields>) {
  const { control, watch } = useForm<DcrFields>({ defaultValues: fields });
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
      {/* ── Vendor & Project ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Vendor & Project Details
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="vendor_name"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Vendor / Company Name"
                  disabled={disabled}
                  size="small"
                />
              </Box>
            )}
          />
          <Controller
            name="capacity_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Installed Capacity (KW)"
                placeholder="e.g. 3.4"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="application_number"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Application Number"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="application_date"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Date of Application"
                placeholder="e.g. 16 Apr 2025"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Consumer ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Consumer Details
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
            name="consumer_address"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Consumer Address"
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

      {/* ── PV Module Details ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          PV Module Details
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="pv_module_capacities"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="PV Module Capacities (comma-separated)"
                  placeholder="e.g. 575.00Wp, 575.00Wp, 575.00Wp"
                  disabled={disabled}
                  size="small"
                  multiline
                  rows={2}
                />
              </Box>
            )}
          />
          <Controller
            name="number_of_pv_modules"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Number of PV Modules"
                placeholder="e.g. 06"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="pv_module_make"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="PV Module Make" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="pv_module_serial_numbers"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="PV Module Serial Numbers (comma-separated)"
                  placeholder="e.g. AS2506081B0664, AS2506081B2290, ..."
                  disabled={disabled}
                  size="small"
                  multiline
                  rows={2}
                />
              </Box>
            )}
          />
          <Controller
            name="cell_manufacturer_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Cell Manufacturer Name"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="cell_gst_invoice_no"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Cell GST Invoice No."
                placeholder="e.g. N/A (Not Applicable)"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Signatory ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Signatory Details
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="signatory_name"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Name" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="signatory_designation"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Designation" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="signatory_phone"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Phone" type="tel" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="signatory_email"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Email"
                type="email"
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
