'use client';

import * as React from 'react';

import { OnboardingWizard } from './onboarding-wizard';
import { type OnboardingMode } from '../constants';

import { useCustomer } from '@/components/features/customers';
import { useProperty } from '@/components/features/properties';
import { Skeleton } from '@/components/ui';
import { getErrorMessage } from '@/lib/utils';

interface OnboardingWizardPageProps {
  mode: OnboardingMode;
  /** create-site (from `?customerId=`) and edit-customer. */
  customerId?: string;
  /** edit-property. */
  propertyId?: string;
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">
      <Skeleton className="h-6 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)] gap-6">
        <Skeleton className="h-96 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-6 text-center rounded-lg bg-error/5">
        <p className="text-sm text-error">{message}</p>
      </div>
    </div>
  );
}

export function OnboardingWizardPage({
  mode,
  customerId,
  propertyId,
}: OnboardingWizardPageProps): React.JSX.Element {
  const isEditProperty = mode === 'edit-property';

  const propertyQuery = useProperty(isEditProperty ? (propertyId ?? '') : '');

  // The customer this run is about: handed in directly, or — when editing a
  // site — the one that owns it, so the header can say whose site this is.
  const targetCustomerId = isEditProperty ? propertyQuery.data?.customerId : customerId;

  const customerQuery = useCustomer(targetCustomerId ?? '', {
    enabled: !!targetCustomerId,
  });

  const needsCustomerUpFront = mode === 'create-site' || mode === 'edit-customer';

  if (needsCustomerUpFront && customerQuery.isLoading) return <LoadingState />;
  if (needsCustomerUpFront && customerQuery.error) {
    return <ErrorState message={getErrorMessage(customerQuery.error)} />;
  }
  if (isEditProperty && propertyQuery.isLoading) return <LoadingState />;
  if (isEditProperty && propertyQuery.error) {
    return <ErrorState message={getErrorMessage(propertyQuery.error)} />;
  }

  return (
    <OnboardingWizard
      mode={mode}
      customerId={targetCustomerId}
      // The owner lookup resolves after the property does; the wizard renders
      // without it and fills the chip in when it lands.
      customer={customerQuery.data as never}
      propertyId={propertyId}
      property={propertyQuery.data}
    />
  );
}
