'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Drawer,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { type JSX, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import {
  type DiscomAdmin,
  type DiscomPayload,
  useDiscomMutations,
} from '../hooks/use-discoms-admin';
import { discomFormSchema, type DiscomFormValues } from '../schemas/discom.schema';
import { buildDiscomPreviewLabel } from '../utils/discom-display.util';

import { color, crm, radius } from '@/lib/theme/tokens';
import { getErrorMessage } from '@/lib/utils';

interface FieldConfig {
  key: keyof DiscomFormValues;
  label: string;
  placeholder: string;
  span?: 1 | 2;
  mono?: boolean;
  helper?: string;
}

interface SectionConfig {
  overline: string;
  hint?: string;
  fields: FieldConfig[];
}

const FIELD_SECTIONS: SectionConfig[] = [
  {
    overline: 'Circle',
    hint: 'Required',
    fields: [
      { key: 'circleName', label: 'Circle name *', placeholder: 'e.g. Sangli' },
      {
        key: 'circleInchargeName',
        label: 'Circle in-charge (SE) *',
        placeholder: 'e.g. Amit Bokil',
      },
      {
        key: 'testingUnitName',
        label: 'Testing unit',
        placeholder: 'e.g. Sangli Testing Unit',
        span: 2,
      },
    ],
  },
  {
    overline: 'Division',
    hint: 'Required',
    fields: [
      { key: 'divisionName', label: 'Division name *', placeholder: 'e.g. Sangli Urban' },
      {
        key: 'divisionInchargeName',
        label: 'Division in-charge (EE) *',
        placeholder: 'e.g. Ashish Mehta',
      },
    ],
  },
  {
    overline: 'Subdivision',
    hint: 'Optional',
    fields: [
      {
        key: 'subdivisionName',
        label: 'Subdivision name',
        placeholder: 'e.g. Vishrambag Subdivision',
      },
      {
        key: 'subdivisionInchargeName',
        label: 'Subdivision in-charge (SDO)',
        placeholder: 'e.g. Rohit Kulkarni',
      },
      {
        key: 'aeqcEngineerName',
        label: 'AEQC engineer',
        placeholder: 'e.g. Nikhil Sawant',
        span: 2,
      },
    ],
  },
  {
    overline: 'Section',
    hint: 'Optional',
    fields: [
      { key: 'sectionName', label: 'Section name', placeholder: 'e.g. Section A' },
      {
        key: 'sectionEngineerName',
        label: 'Section engineer',
        placeholder: 'e.g. Pooja Deshmukh',
      },
    ],
  },
  {
    overline: 'Office & contact',
    hint: 'Used for net-metering follow-ups',
    fields: [
      { key: 'mobileNo', label: 'Mobile no', placeholder: '9876543210', mono: true },
      { key: 'email', label: 'Email', placeholder: 'office@mahadiscom.in' },
      {
        key: 'officeAddress',
        label: 'Office address',
        placeholder: 'e.g. MSEDCL Division office, Vishrambag, Sangli 416416',
        span: 2,
      },
      {
        key: 'latitude',
        label: 'Office latitude',
        placeholder: '16.8524',
        mono: true,
        helper: 'Decimal degrees',
      },
      {
        key: 'longitude',
        label: 'Office longitude',
        placeholder: '74.5815',
        mono: true,
        helper: 'Decimal degrees',
      },
    ],
  },
];

function toFormValues(discom: DiscomAdmin | null): DiscomFormValues {
  if (!discom) {
    return {
      circleName: '',
      circleInchargeName: '',
      divisionName: '',
      divisionInchargeName: '',
      testingUnitName: '',
      subdivisionName: '',
      subdivisionInchargeName: '',
      aeqcEngineerName: '',
      sectionName: '',
      sectionEngineerName: '',
      officeAddress: '',
      mobileNo: '',
      email: '',
      latitude: '',
      longitude: '',
      isActive: true,
    };
  }
  return {
    circleName: discom.circleName,
    circleInchargeName: discom.circleInchargeName,
    divisionName: discom.divisionName,
    divisionInchargeName: discom.divisionInchargeName,
    testingUnitName: discom.testingUnitName ?? '',
    subdivisionName: discom.subdivisionName ?? '',
    subdivisionInchargeName: discom.subdivisionInchargeName ?? '',
    aeqcEngineerName: discom.aeqcEngineerName ?? '',
    sectionName: discom.sectionName ?? '',
    sectionEngineerName: discom.sectionEngineerName ?? '',
    officeAddress: discom.officeAddress ?? '',
    mobileNo: discom.mobileNo ?? '',
    email: discom.email ?? '',
    latitude: discom.geoLocation?.latitude != null ? String(discom.geoLocation.latitude) : '',
    longitude: discom.geoLocation?.longitude != null ? String(discom.geoLocation.longitude) : '',
    isActive: discom.isActive,
  };
}

function toPayload(values: DiscomFormValues): DiscomPayload {
  const lat = values.latitude?.trim();
  const lng = values.longitude?.trim();
  const latNum = lat ? Number(lat) : NaN;
  const lngNum = lng ? Number(lng) : NaN;

  return {
    circleName: values.circleName.trim(),
    circleInchargeName: values.circleInchargeName.trim(),
    divisionName: values.divisionName.trim(),
    divisionInchargeName: values.divisionInchargeName.trim(),
    testingUnitName: values.testingUnitName?.trim() || undefined,
    subdivisionName: values.subdivisionName?.trim() || undefined,
    subdivisionInchargeName: values.subdivisionInchargeName?.trim() || undefined,
    aeqcEngineerName: values.aeqcEngineerName?.trim() || undefined,
    sectionName: values.sectionName?.trim() || undefined,
    sectionEngineerName: values.sectionEngineerName?.trim() || undefined,
    officeAddress: values.officeAddress?.trim() || undefined,
    mobileNo: values.mobileNo?.trim() || undefined,
    email: values.email?.trim() || undefined,
    geoLocation:
      !Number.isNaN(latNum) && !Number.isNaN(lngNum)
        ? { latitude: latNum, longitude: lngNum }
        : undefined,
    isActive: values.isActive,
  };
}

export interface DiscomFormDrawerProps {
  open: boolean;
  discom: DiscomAdmin | null;
  onClose: () => void;
}

export function DiscomFormDrawer({ open, discom, onClose }: DiscomFormDrawerProps): JSX.Element {
  const isEdit = Boolean(discom?.id);
  const mutations = useDiscomMutations();

  const form = useForm<DiscomFormValues>({
    resolver: zodResolver(discomFormSchema),
    mode: 'onChange',
    defaultValues: toFormValues(discom),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(discom));
    }
  }, [open, discom, form]);

  const watched = form.watch();
  const previewLabel =
    buildDiscomPreviewLabel(watched) || 'Add a circle and division to see the label';
  const mutationError = isEdit ? mutations.update.error : mutations.create.error;

  const isSubmitting = mutations.create.isPending || mutations.update.isPending;

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = toPayload(values);
    try {
      if (isEdit && discom) {
        await mutations.update.mutateAsync({ id: discom.id, data: payload });
      } else {
        await mutations.create.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Toast handled in mutation
    }
  });

  const sectionTitle = useMemo(() => {
    if (isEdit) return `Edit ${discom?.divisionName || 'DISCOM'}`;
    return 'Add a DISCOM';
  }, [isEdit, discom?.divisionName]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 640,
          maxWidth: '94vw',
          borderRadius: '32px 0 0 32px',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: 3.25,
          pt: 2.75,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: color['text-tertiary'], fontWeight: 700, letterSpacing: '0.12em' }}
          >
            {isEdit ? 'Admin · Edit DISCOM' : 'Admin · New DISCOM'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.025em', mt: 0.5 }}>
            {sectionTitle}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: color['text-secondary'], mt: 0.5 }}>
            {isEdit
              ? 'Changes apply to every site already mapped to this hierarchy.'
              : 'Circle and division are enough to start — add subdivision and section when the utility confirms them.'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box
        component="form"
        onSubmit={(e) => void handleSubmit(e)}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 3.25,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.75,
        }}
      >
        {mutationError ? (
          <Alert severity="error" sx={{ borderRadius: radius['rf-md'] }}>
            {getErrorMessage(mutationError)}
          </Alert>
        ) : null}

        {Object.keys(form.formState.errors).length > 0 && form.formState.isSubmitted ? (
          <Alert severity="error" sx={{ borderRadius: radius['rf-md'] }}>
            Fill the highlighted fields to save this DISCOM.
          </Alert>
        ) : null}

        <Box
          sx={{
            p: 1.75,
            borderRadius: radius['rf-md'],
            backgroundColor: color['canvas-sunken'],
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: color['text-tertiary'], fontWeight: 700, letterSpacing: '0.12em' }}
          >
            Sales reps will see
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: previewLabel.includes('Add') ? color['text-tertiary'] : color['accent-ink'],
            }}
          >
            {previewLabel}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: color['text-tertiary'] }}>
            This label appears in the DISCOM picker on the site survey and net-metering forms.
          </Typography>
        </Box>

        {FIELD_SECTIONS.map((section) => (
          <Box key={section.overline} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Typography
                variant="overline"
                sx={{ color: color['text-tertiary'], fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                {section.overline}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', backgroundColor: color['canvas-sunken'] }} />
              {section.hint ? (
                <Typography sx={{ fontSize: 11, color: color['text-tertiary'] }}>
                  {section.hint}
                </Typography>
              ) : null}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.75,
              }}
            >
              {section.fields.map((field) => (
                <TextField
                  key={field.key}
                  size="small"
                  fullWidth
                  label={field.label}
                  placeholder={field.placeholder}
                  helperText={
                    form.formState.errors[field.key]?.message ?? field.helper ?? undefined
                  }
                  error={Boolean(form.formState.errors[field.key])}
                  {...form.register(field.key)}
                  sx={{
                    gridColumn: field.span === 2 ? 'span 2' : undefined,
                    '& input': field.mono ? { fontFamily: 'var(--font-mono)' } : undefined,
                  }}
                />
              ))}
            </Box>
          </Box>
        ))}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Typography
              variant="overline"
              sx={{ color: color['text-tertiary'], fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Availability
            </Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: color['canvas-sunken'] }} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              p: 1.5,
              borderRadius: radius['rf-md'],
              backgroundColor: color['canvas-sunken'],
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: crm['text-row'] }}>Active</Typography>
              <Typography sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}>
                Inactive DISCOMs stay on existing sites but disappear from the picker.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={form.watch('isActive')}
                  onChange={(_, checked) => form.setValue('isActive', checked)}
                />
              }
              label=""
              sx={{ m: 0 }}
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: 3.25,
          py: 2,
          borderTop: `1px solid ${color['canvas-sunken']}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography sx={{ fontSize: 11.5, color: color['text-tertiary'] }}>
          Fields marked * are required
        </Typography>
        <Stack direction="row" spacing={1.25}>
          <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isSubmitting || !form.formState.isValid}
            onClick={() => void handleSubmit()}
          >
            {isEdit ? 'Save changes' : 'Add DISCOM'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
