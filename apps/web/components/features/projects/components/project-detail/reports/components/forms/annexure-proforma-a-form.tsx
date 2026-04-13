'use client';

import { Box, Divider } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { AnnexureProformaFields } from '../../templates/annexure-proforma-a.template';
import type { ReportFormProps } from '../../types/report.types';

import { MUIInput, MUITypography } from '@/components/ui';

const DEBOUNCE_MS = 300;

export function AnnexureProformaForm({
  fields,
  onChange,
  disabled,
}: ReportFormProps<AnnexureProformaFields>) {
  const { control, watch } = useForm<AnnexureProformaFields>({ defaultValues: fields });
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
            name="consumer_number"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Consumer Number" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="mobile_number"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Mobile Number" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Email" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="address_of_installation"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Address of Installation"
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

      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          RE System Details
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="re_arrangement_type"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="RE Arrangement Type"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="re_source"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="RE Source" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="sanctioned_capacity_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Sanctioned Capacity (KW)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="capacity_type"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Capacity Type" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="project_model"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Project Model" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="re_installed_capacity_rooftop_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="RE Installed Capacity Rooftop (KW)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="re_installed_capacity_rooftop_ground_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="RE Installed Capacity Rooftop + Ground (KW)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="re_installed_capacity_ground_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="RE Installed Capacity Ground (KW)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="installation_date"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Installation Date"
                placeholder="e.g. 15 Jan 2024"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Solar PV Details
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="inverter_capacity_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Inverter Capacity (KW)"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="inverter_make"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="Inverter Make" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="no_of_pv_modules"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="No. of PV Modules"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="module_capacity_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Module Capacity (KW)"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Location & Vendor
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="district"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="District" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <MUIInput {...field} fieldLabel="State" disabled={disabled} size="small" />
            )}
          />
          <Controller
            name="vendor_name"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput {...field} fieldLabel="Vendor Name" disabled={disabled} size="small" />
              </Box>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
}
