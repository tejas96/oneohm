'use client';

import { Box, Divider } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';


import type { WcrFields } from '../../templates/wcr.template';
import type { ReportFormProps } from '../../types/report.types';

import { MUIInput, MUITypography } from '@/components/ui';

const DEBOUNCE_MS = 300;

export function WcrForm({ fields, onChange, disabled }: ReportFormProps<WcrFields>) {
  const { control, watch } = useForm<WcrFields>({ defaultValues: fields });
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
    // values object reference changes every render; serialised is the stable dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Section 1: Vendor & Consumer Info ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Vendor &amp; Consumer Info
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="vendor_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Vendor Name"
                placeholder="Company legal name"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="consumer_name"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Consumer Name"
                placeholder="Full name"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="consumer_number"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Consumer Number"
                placeholder="e.g. 279692003475"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Category"
                placeholder="e.g. Private / Government"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="site_address"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Site Address"
                  placeholder="Complete address with PIN"
                  disabled={disabled}
                  size="small"
                  multiline
                  rows={2}
                />
              </Box>
            )}
          />
          <Controller
            name="sanction_number"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Sanction Number"
                placeholder="e.g. 63436547"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Section 2: System Capacity ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          System Capacity
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="sanctioned_capacity_kw"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Sanctioned Capacity (KW)"
                placeholder="e.g. 3.5"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="installed_capacity_kw"
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
        </Box>
      </Box>

      <Divider />

      {/* ── Section 3: Module Specifications ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Module Specifications
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="module_make"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Make of Module"
                placeholder="e.g. Adani"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="module_model_number"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="ALMM Model Number"
                placeholder="e.g. ASB-M10-144-575"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="module_wattage"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Wattage per Module (Wp)"
                placeholder="e.g. 575"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="module_count"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="No. of Modules"
                placeholder="e.g. 06"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="total_capacity_kwp"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Total Capacity (KWp)"
                placeholder="e.g. 3450"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="module_warranty"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Warranty Details"
                placeholder="e.g. 12+30 Years"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Section 4: Inverter / PCU ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Inverter / PCU
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="inverter_make_model"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Make &amp; Model Number"
                  placeholder="e.g. GOODWE 53300SSA253L0275"
                  disabled={disabled}
                  size="small"
                />
              </Box>
            )}
          />
          <Controller
            name="inverter_rating"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Rating (KW)"
                placeholder="e.g. 3.3"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="charge_controller_type"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Charge Controller Type"
                placeholder="e.g. MPPT"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="inverter_capacity"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Inverter Capacity (KW)"
                placeholder="e.g. 3.3"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="inverter_hpd"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="HPD"
                placeholder="e.g. NA"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="inverter_year_of_manufacturing"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Year of Manufacturing"
                placeholder="e.g. 2025"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Section 5: Safety ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Safety
        </MUITypography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Controller
            name="earthing_details"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Earthing Details (count &amp; resistance)"
                placeholder="e.g. 3 - 3Ω, 4Ω, 3Ω"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="lightning_arrester_text"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Lightning Arrester"
                placeholder="e.g. Lightning Arrester provided"
                disabled={disabled}
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <Divider />

      {/* ── Section 6: CMC & Identity ── */}
      <Box>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          CMC &amp; Consumer Identity
        </MUITypography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Controller
            name="cmc_period_years"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="CMC Period (Years)"
                placeholder="e.g. 5"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="consumer_id_type"
            control={control}
            render={({ field }) => (
              <MUIInput
                {...field}
                fieldLabel="Identity Type"
                placeholder="e.g. Aadhar Card"
                disabled={disabled}
                size="small"
              />
            )}
          />
          <Controller
            name="consumer_aadhaar_number"
            control={control}
            render={({ field }) => (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <MUIInput
                  {...field}
                  fieldLabel="Aadhar Number"
                  placeholder="e.g. 7051 1116 7478"
                  disabled={disabled}
                  size="small"
                />
              </Box>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
}
