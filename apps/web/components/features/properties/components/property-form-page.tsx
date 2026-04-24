'use client';

import * as React from 'react';

import { PropertyForm } from './property-form';
import { useCustomerById, useProperty } from '../hooks';

import { Skeleton } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertyFormPageProps {
  mode: 'create' | 'edit';
  /** Customer ID from URL param (create context-aware mode) */
  customerId?: string;
  /** Property ID from URL param (edit mode) */
  propertyId?: string;
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
  onRetry?: () => void;
  backHref?: string;
}

function ErrorState({ message, onRetry, backHref }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-6 text-center rounded-lg border border-error/20 bg-error/5">
        <p className="text-sm text-error mb-4">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          )}
          {backHref && (
            <a href={backHref} className="text-sm text-foreground-secondary hover:underline">
              Go back
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PropertyFormPage({
  mode,
  customerId,
  propertyId,
}: PropertyFormPageProps): React.JSX.Element {
  const isEditMode = mode === 'edit';

  // Edit mode: fetch property by ID
  const {
    data: property,
    isLoading: isLoadingProperty,
    error: propertyError,
    refetch: refetchProperty,
  } = useProperty(isEditMode && propertyId ? propertyId : '');

  // Create context-aware mode: fetch customer by ID
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
    refetch: refetchCustomer,
  } = useCustomerById(!isEditMode ? customerId : undefined);

  // Edit mode: loading property
  if (isEditMode && isLoadingProperty) {
    return <LoadingState />;
  }

  // Edit mode: error loading property
  if (isEditMode && (propertyError || (!isLoadingProperty && !property))) {
    return (
      <ErrorState
        message={propertyError ? getErrorMessage(propertyError) : 'Property not found'}
        onRetry={() => void refetchProperty()}
        backHref={
          propertyId
            ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId })
            : ROUTES.PROPERTIES.LIST
        }
      />
    );
  }

  // Create context-aware mode: loading customer
  if (!isEditMode && customerId && isLoadingCustomer) {
    return <LoadingState />;
  }

  // Create context-aware mode: error loading customer
  if (!isEditMode && customerId && customerError) {
    return (
      <ErrorState message={getErrorMessage(customerError)} onRetry={() => void refetchCustomer()} />
    );
  }

  if (isEditMode) {
    return <PropertyForm mode="edit" propertyId={propertyId} initialData={property} />;
  }

  return <PropertyForm mode="create" customerId={customerId} customer={customer} />;
}
