'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import Alert from '@mui/material/Alert';
import { QuoteStatus, PropertyStatus } from '@oneohm-epc/shared/types';
import type { UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';

import { MUISelect, MUITypography } from '@/components/ui';
import {
  type CustomerQuote,
  useCustomerPropertiesByCustomer,
  useCustomerQuotes,
} from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

// ── Props ──────────────────────────────────────────────────────

interface PropertyQuoteSelectorsProps {
  form: UseFormReturn<ProjectCreateFormData>;
  customerId: string;
}

// ── Component ─────────────────────────────────────────────────

export function PropertyQuoteSelectors({
  form,
  customerId,
}: PropertyQuoteSelectorsProps): React.JSX.Element {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedPropertyId = watch('propertyId');
  const selectedQuoteId = watch('quoteId');

  const { data: properties = [], isLoading: propsLoading } =
    useCustomerPropertiesByCustomer(customerId);
  const { data: quotesResponse, isLoading: quotesLoading } = useCustomerQuotes(customerId, {
    status: QuoteStatus.ACCEPTED,
  });
  const allQuotes: CustomerQuote[] = quotesResponse?.data ?? [];

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null;
  const propertyConverted = selectedProperty?.status === PropertyStatus.CONVERTED;

  const filteredQuotes = allQuotes.filter(
    (q) => !selectedPropertyId || !q.propertyId || q.propertyId === selectedPropertyId,
  );

  const propertyOptions = properties.map((p) => {
    const isConverted = p.status === PropertyStatus.CONVERTED;
    const label = p.propertyName || p.consumerName || p.address || 'Property';
    return {
      value: p.id,
      label: isConverted ? `${label} (Converted)` : label,
      disabled: isConverted,
    };
  });

  const quoteOptions = filteredQuotes.map((q) => ({
    value: q.id,
    label: `${q.quoteNumber} · ${formatCurrency(q.effectivePrice ?? q.finalPrice ?? q.basePrice ?? 0)} · ${String(q.systemSizeKw ?? 0)}kW`,
  }));

  function handlePropertyChange(val: string): void {
    setValue('propertyId', val, { shouldValidate: true });
    setValue('quoteId', '');
  }

  function handleQuoteChange(val: string): void {
    setValue('quoteId', val, { shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Property Selector */}
      <div>
        <MUISelect
          fieldLabel="Property / Installation Site"
          value={selectedPropertyId}
          onChange={(e) => handlePropertyChange(e.target.value as string)}
          options={propertyOptions}
          placeholder={propsLoading ? 'Loading properties…' : 'Select a property'}
          disabled={propsLoading}
          error={errors.propertyId?.message}
          fullWidth
        />
        {properties.length === 0 && !propsLoading && (
          <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} className="mt-2">
            No properties found for this customer. Add a property first.
          </Alert>
        )}
        {propertyConverted && (
          <Alert
            severity="warning"
            icon={<ReportProblemOutlinedIcon fontSize="small" />}
            className="mt-2"
          >
            This property has already been converted to a project.
          </Alert>
        )}
      </div>

      {/* Quote Selector — shown once property is selected */}
      {selectedPropertyId && (
        <div>
          <MUISelect
            fieldLabel="Accepted Quote"
            value={selectedQuoteId}
            onChange={(e) => handleQuoteChange(e.target.value as string)}
            options={quoteOptions}
            placeholder={quotesLoading ? 'Loading quotes…' : 'Select a quote'}
            disabled={quotesLoading}
            error={errors.quoteId?.message}
            fullWidth
          />
          {filteredQuotes.length === 0 && !quotesLoading && (
            <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} className="mt-2">
              No accepted quotes found for this property. Accept a quote first.
            </Alert>
          )}
        </div>
      )}

      {/* Selected quote summary */}
      {selectedQuoteId &&
        (() => {
          const q = filteredQuotes.find((x) => x.id === selectedQuoteId);
          if (!q) return null;
          return (
            <div className="p-3 border border-border-light rounded-lg bg-background-secondary">
              <MUITypography variant="finePrint" className="text-foreground-secondary mb-1">
                Selected Quote
              </MUITypography>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Quote #
                  </MUITypography>
                  <MUITypography variant="bodyPrimary">{q.quoteNumber}</MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    System Size
                  </MUITypography>
                  <MUITypography variant="bodyPrimary">{q.systemSizeKw ?? 0}kW</MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Effective Price
                  </MUITypography>
                  <MUITypography variant="bodyPrimary">
                    {formatCurrency(q.effectivePrice ?? q.finalPrice ?? q.basePrice ?? 0)}
                  </MUITypography>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
