'use client';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip } from '@mui/material';
import { getReportSchema, type ReportAutoFillSource } from '@tejas96/shared/reports';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { MUIInput, MUITypography } from '@/components/ui';
import { MUI_LABEL_MB } from '@/lib/theme/mui-theme';

const AUTO_FILL_LABELS: Record<ReportAutoFillSource, string> = {
  project: 'From project',
  property: 'From property',
  org: 'From org',
  bom: 'From BOM',
  manual: 'Manual',
};

function FieldLabelSlot({
  label,
  required,
  autoFillSource,
}: {
  label: string;
  required?: boolean;
  autoFillSource?: ReportAutoFillSource;
}) {
  const showChip = Boolean(autoFillSource && autoFillSource !== 'manual');

  return (
    <Box
      sx={{
        mb: MUI_LABEL_MB,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <MUITypography
        variant="bodyPrimary"
        component="div"
        fontWeight={500}
        title={label}
        sx={{
          flex: showChip ? 1 : undefined,
          minWidth: 0,
          lineHeight: 1.25,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {required ? (
          <Box component="span" sx={{ color: 'error.main', ml: '2px' }}>
            *
          </Box>
        ) : null}
      </MUITypography>
      {showChip && autoFillSource ? (
        <Chip
          label={AUTO_FILL_LABELS[autoFillSource]}
          size="small"
          variant="outlined"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            color: 'text.secondary',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        />
      ) : null}
    </Box>
  );
}

interface ReportSchemaFormProps {
  reportId: string;
  fields: Record<string, string>;
  formVersion: number;
  onChange: (fields: Record<string, string>) => void;
  disabled?: boolean;
}

const normalizeValue = (val: unknown): string => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  return '';
};

const areFieldsEqual = (a: Record<string, string>, b: Record<string, string>) => {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    if (normalizeValue(a[key]) !== normalizeValue(b[key])) {
      return false;
    }
  }
  return true;
};

export function ReportSchemaForm({
  reportId,
  fields,
  formVersion,
  onChange,
  disabled,
}: ReportSchemaFormProps) {
  const schema = getReportSchema(reportId);
  const { control, watch, reset } = useForm({ defaultValues: fields });
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const serverFieldsRef = useRef(fields);

  // Reset only when the server sends fresh data (initialize / refresh), not on every preview tick.
  useEffect(() => {
    reset(fieldsRef.current);
    serverFieldsRef.current = fieldsRef.current;
  }, [formVersion, reset]);

  useEffect(() => {
    const subscription = watch((values) => {
      const next = values as Record<string, string>;
      if (areFieldsEqual(next, fieldsRef.current)) return;
      onChange(next);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  const formValues = watch();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {schema.sections.map((section, index) => {
        const sectionFields = schema.fields.filter((f) => f.section === section.id);
        const autoFilled = sectionFields.filter(
          (f) => f.autoFillSource && f.autoFillSource !== 'manual',
        ).length;

        const requiredFields = sectionFields.filter((f) => f.required);
        const filledRequired = requiredFields.filter((f) => !!formValues[f.key]?.trim()).length;

        return (
          <Accordion key={section.id} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <MUITypography variant="sectionTitle">{section.title}</MUITypography>
                <MUITypography variant="finePrint" color="text.secondary">
                  {sectionFields.length} fields · {autoFilled} auto-filled
                  {requiredFields.length > 0 && (
                    <>
                      {' · '}
                      {filledRequired} of {requiredFields.length} required filled
                    </>
                  )}
                </MUITypography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ containerType: 'inline-size', width: '100%' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 1.5,
                    alignItems: 'start',
                    '@container (min-width: 520px)': {
                      gridTemplateColumns: '1fr 1fr',
                    },
                  }}
                >
                  {sectionFields.map((fieldDef) => (
                    <Controller
                      key={fieldDef.key}
                      name={fieldDef.key}
                      control={control}
                      render={({ field }) => (
                        <Box
                          sx={{
                            gridColumn: fieldDef.colSpan === 2 ? '1 / -1' : undefined,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <FieldLabelSlot
                            label={fieldDef.label}
                            required={fieldDef.required}
                            autoFillSource={fieldDef.autoFillSource}
                          />
                          {fieldDef.helpText ? (
                            <MUITypography
                              variant="body"
                              sx={{ mb: 0.5, display: 'block', fontSize: '0.75rem' }}
                            >
                              {fieldDef.helpText}
                            </MUITypography>
                          ) : null}
                          <MUIInput
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            fieldLabel={undefined}
                            placeholder={fieldDef.placeholder}
                            disabled={disabled}
                            size="small"
                            required={fieldDef.required}
                            error={
                              fieldDef.required && !field.value?.trim()
                                ? 'This field is required'
                                : undefined
                            }
                            multiline={fieldDef.type === 'textarea'}
                            rows={fieldDef.type === 'textarea' ? 2 : undefined}
                            type={
                              fieldDef.type === 'email'
                                ? 'email'
                                : fieldDef.type === 'date'
                                  ? 'date'
                                  : fieldDef.type === 'phone'
                                    ? 'tel'
                                    : 'text'
                            }
                            inputProps={
                              fieldDef.type === 'number'
                                ? { inputMode: 'decimal' }
                                : fieldDef.type === 'phone'
                                  ? { inputMode: 'tel' }
                                  : undefined
                            }
                          />
                        </Box>
                      )}
                    />
                  ))}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
