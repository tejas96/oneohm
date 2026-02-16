'use client';

import * as React from 'react';

import { CreatePropertyForm } from './create-property-form';
import { useCustomerById, useCustomersList } from '../hooks';

import { Skeleton } from '@/components/ui';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface CreatePropertyPageProps {
  /** Customer ID from URL param (context-aware mode) */
  customerId?: string;
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState(): React.JSX.Element {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-6 text-center rounded-lg border border-error/20 bg-error/5">
        <p className="text-sm text-error mb-4">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CreatePropertyPage({ customerId }: CreatePropertyPageProps): React.JSX.Element {
  // Context-aware mode: fetch customer by ID
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
    refetch: refetchCustomer,
  } = useCustomerById(customerId);

  // Standalone mode: fetch customers list for selector
  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomersList();

  // Context-aware mode: loading customer
  if (customerId && isLoadingCustomer) {
    return <LoadingState />;
  }

  // Context-aware mode: error loading customer
  if (customerId && customerError) {
    return (
      <ErrorState
        message={getErrorMessage(customerError)}
        onRetry={() => void refetchCustomer()}
      />
    );
  }

  // Standalone mode: error loading customers list
  if (!customerId && customersError) {
    return (
      <ErrorState
        message={getErrorMessage(customersError)}
        onRetry={() => void refetchCustomers()}
      />
    );
  }

  return (
    <CreatePropertyForm
      customerId={customerId}
      customer={customer}
      customers={customersData?.data ?? []}
      isLoadingCustomers={isLoadingCustomers}
    />
  );
}
