'use client';

import type { JSX } from 'react';

import { PropertyDocumentHub } from '@/components/shared/document-manager';

interface DocumentsTabProps {
  propertyId: string;
}

export function DocumentsTab({ propertyId }: DocumentsTabProps): JSX.Element {
  return <PropertyDocumentHub propertyId={propertyId} allowUpload />;
}
