'use client';

import type { JSX } from 'react';

import { CustomerDocumentsTab } from '../../components/customer-documents-tab';
import type { CustomerPropertyResponse } from '../../hooks';

export interface DocumentsTabProps {
  properties: CustomerPropertyResponse[];
  propertyFilter: string;
  onPropertyFilterChange: (value: string) => void;
}

export function DocumentsTab({
  properties,
  propertyFilter,
  onPropertyFilterChange,
}: DocumentsTabProps): JSX.Element {
  return (
    <CustomerDocumentsTab
      properties={properties}
      propertyFilter={propertyFilter}
      onPropertyFilterChange={onPropertyFilterChange}
    />
  );
}
