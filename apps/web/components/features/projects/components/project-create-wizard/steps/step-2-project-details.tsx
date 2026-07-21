'use client';

import DescriptionIcon from '@mui/icons-material/Description';
import LockIcon from '@mui/icons-material/Lock';
import { ProjectPriority, QuoteStatus } from '@tejas96/shared/types';
import { useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { PROJECT_PRIORITY_LABELS } from '../../../constants';
import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';

import { MUIDatePicker, MUIInput, MUISelect, MUIStatusChip, MUITypography } from '@/components/ui';
import {
  useCustomerDetail,
  useCustomerPropertiesByCustomer,
  useCustomerQuotes,
} from '@/lib/hooks/resources';
import { formatCurrency, formatSystemSize } from '@/lib/utils';

// ── Props ──────────────────────────────────────────────────────

interface Step2ProjectDetailsProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

// ── Component ─────────────────────────────────────────────────

/** Format using local calendar date to avoid UTC timezone shift. */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function Step2ProjectDetails({ form }: Step2ProjectDetailsProps): React.JSX.Element {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;

  const customerId = watch('customerId');
  const propertyId = watch('propertyId');
  const quoteId = watch('quoteId');
  const name = watch('name');
  const priority = watch('priority');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const defaultEndDate = useMemo(() => addMonths(today, 1), [today]);

  // Set default dates once on mount if not already set.
  // Empty dependency array is intentional — we only want this to run once.
  useEffect(() => {
    if (!form.getValues('startDate')) {
      setValue('startDate', toIsoDate(today), { shouldValidate: false });
    }
    if (!form.getValues('endDate')) {
      setValue('endDate', toIsoDate(defaultEndDate), { shouldValidate: false });
    }
  }, []);

  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  const { data: customer } = useCustomerDetail(customerId || '');
  const { data: properties = [] } = useCustomerPropertiesByCustomer(customerId || '');
  const { data: quotesResponse } = useCustomerQuotes(customerId || '', {
    status: QuoteStatus.ACCEPTED,
  });

  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null;
  const selectedQuote = (quotesResponse?.data ?? []).find((q) => q.id === quoteId) ?? null;
  const actualSystemSizeKw = selectedQuote?.actualSystemSizeKw ?? null;
  const requestedSystemSizeKw = selectedQuote?.systemSizeKw;

  // Auto-generate project name
  const autoName = useMemo(() => {
    const custName = customer
      ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
      : '';
    const propName = selectedProperty?.propertyName || selectedProperty?.consumerName || '';
    const sizeValue = selectedQuote?.actualSystemSizeKw ?? selectedQuote?.systemSizeKw;
    const size = sizeValue && sizeValue > 0 ? `${formatSystemSize(sizeValue)}kW` : '';
    const parts = [custName, propName, size].filter(Boolean);
    return parts.join(' - ');
  }, [customer, selectedProperty, selectedQuote]);

  useEffect(() => {
    if (!isNameManuallyEdited && autoName) {
      setValue('name', autoName);
    }
  }, [autoName, isNameManuallyEdited, setValue]);

  const priorityOptions = Object.values(ProjectPriority).map((p) => ({
    value: p,
    label: PROJECT_PRIORITY_LABELS[p] ?? p,
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <DescriptionIcon className="text-primary" fontSize="small" />
        </div>
        <div>
          <MUITypography variant="sectionTitle">Project Details</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary">
            Review or adjust the auto-generated project name and planning details.
          </MUITypography>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Project Name */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MUITypography variant="bodyPrimary" className="font-medium">
              Project Name
            </MUITypography>
            {!isNameManuallyEdited && (
              <MUIStatusChip label="Auto-generated" color="info" size="small" />
            )}
          </div>
          <MUIInput
            value={name}
            onChange={(e) => {
              setIsNameManuallyEdited(true);
              setValue('name', e.target.value, { shouldValidate: true });
            }}
            error={errors.name?.message}
            placeholder="e.g. Smith - Residential - 5kW"
            fullWidth
          />
        </div>

        {/* System Specs (read-only from quote) */}
        {selectedQuote && (
          <div className="p-4 rounded-lg bg-background-secondary">
            <div className="flex items-center gap-2 mb-3">
              <LockIcon fontSize="small" className="text-foreground-tertiary" />
              <MUITypography variant="metaLabel">From Quote</MUITypography>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <MUITypography variant="timestamp" className="text-foreground-secondary mb-1">
                  Project Type
                </MUITypography>
                <MUITypography variant="bodyPrimary">
                  {selectedQuote.projectType || '—'}
                </MUITypography>
              </div>
              <div>
                <MUITypography variant="timestamp" className="text-foreground-secondary mb-1">
                  Actual System Size
                </MUITypography>
                <MUITypography variant="bodyPrimary">
                  {actualSystemSizeKw != null
                    ? `${formatSystemSize(actualSystemSizeKw)}kW`
                    : requestedSystemSizeKw
                      ? `${formatSystemSize(requestedSystemSizeKw)}kW`
                      : '—'}
                </MUITypography>
                {actualSystemSizeKw != null && requestedSystemSizeKw ? (
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    (req/sel {formatSystemSize(requestedSystemSizeKw)}kW)
                  </MUITypography>
                ) : null}
              </div>
              <div>
                <MUITypography variant="timestamp" className="text-foreground-secondary mb-1">
                  Estimated Cost
                </MUITypography>
                <MUITypography variant="bodyPrimary">
                  {formatCurrency(selectedQuote.finalPrice ?? selectedQuote.basePrice ?? 0)}
                </MUITypography>
              </div>
            </div>
          </div>
        )}

        {/* Priority */}
        <MUISelect
          fieldLabel="Priority"
          value={priority}
          onChange={(e) =>
            setValue('priority', e.target.value as ProjectPriority, { shouldValidate: true })
          }
          options={priorityOptions}
          error={errors.priority?.message}
          fullWidth
        />

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <MUIDatePicker
            fieldLabel="Start Date"
            value={startDate || null}
            onChange={(date) => {
              const iso = date ? toIsoDate(date) : '';
              setValue('startDate', iso, { shouldValidate: true });
              // Push end date forward if it's now before the new start date
              if (iso && endDate && endDate < iso) {
                setValue('endDate', iso, { shouldValidate: true });
              }
            }}
            minDate={today}
            error={errors.startDate?.message}
          />
          <MUIDatePicker
            fieldLabel="End Date"
            value={endDate || null}
            onChange={(date) => {
              setValue('endDate', date ? toIsoDate(date) : '', { shouldValidate: true });
            }}
            minDate={startDate ? new Date(`${startDate}T00:00:00`) : today}
            error={errors.endDate?.message}
          />
        </div>

        {/* Description */}
        <MUIInput
          fieldLabel="Description"
          value={watch('description') ?? ''}
          onChange={(e) => setValue('description', e.target.value)}
          placeholder="Brief description of the project scope…"
          multiline
          rows={3}
          fullWidth
        />
      </div>
    </div>
  );
}
