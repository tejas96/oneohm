'use client';

import BoltIcon from '@mui/icons-material/Bolt';
import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';
import { CustomerSearchChip } from '../components/customer-search-chip';
import { PropertyQuoteSelectors } from '../components/property-quote-selectors';

import { MUITypography } from '@/components/ui';
import { type Customer, useCustomerDetail } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface Step1SourceSelectionProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

// ── Component ─────────────────────────────────────────────────

export function Step1SourceSelection({ form }: Step1SourceSelectionProps): React.JSX.Element {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedCustomerId = watch('customerId');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Deep-link pre-fill: if customerId is set (from URL), fetch the customer details
  const { data: deepLinkCustomer } = useCustomerDetail(selectedCustomerId || '');
  useEffect(() => {
    if (deepLinkCustomer && !selectedCustomer) {
      setSelectedCustomer(deepLinkCustomer);
    }
  }, [deepLinkCustomer, selectedCustomer]);

  function handleCustomerSelect(customer: Customer): void {
    setSelectedCustomer(customer);
    setValue('customerId', customer.id, { shouldValidate: true });
    // Clear downstream selections when customer changes
    setValue('propertyId', '');
    setValue('quoteId', '');
  }

  function handleClearCustomer(): void {
    setSelectedCustomer(null);
    setValue('customerId', '');
    setValue('propertyId', '');
    setValue('quoteId', '');
    setValue('teamMembers', []);
    setValue('projectManagerId', '');
    setValue('excludedStepIds', []);
    setValue('taskAssignments', []);
    setValue('taskMilestoneOverrides', []);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <BoltIcon className="text-primary" fontSize="small" />
        </div>
        <div>
          <MUITypography variant="sectionTitle">Source Selection</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary">
            Link this project to a customer, property, and accepted quote.
          </MUITypography>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Customer Search */}
        <div>
          <MUITypography variant="bodyPrimary" className="mb-2 font-medium">
            Customer
          </MUITypography>
          <CustomerSearchChip
            selectedCustomer={selectedCustomer}
            onSelect={handleCustomerSelect}
            onClear={handleClearCustomer}
            error={errors.customerId?.message}
          />
        </div>

        {/* Property & Quote Selectors — shown after customer is selected */}
        {selectedCustomerId && (
          <PropertyQuoteSelectors form={form} customerId={selectedCustomerId} />
        )}
      </div>
    </div>
  );
}
