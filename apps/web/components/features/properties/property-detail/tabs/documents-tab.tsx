'use client';

import { Box, Stack } from '@mui/material';
import type { JSX } from 'react';

import { SectionHeading } from '@/components/features/customers/customer-detail/primitives';
import { tableCardSx } from '@/components/features/customers/customer-detail/styles';
import { PropertyDocumentHub } from '@/components/shared/document-manager';

export interface DocumentsTabProps {
  propertyId: string;
}

/**
 * The hub renders documents grouped by the entity they hang off — the site
 * itself, its quotes, its project. It sits on the page's card surface here
 * rather than floating on the canvas, so it reads as one section like every
 * other tab.
 */
export function DocumentsTab({ propertyId }: DocumentsTabProps): JSX.Element {
  return (
    <Stack gap={1.5}>
      <SectionHeading sx={{ mb: 0 }}>Documents</SectionHeading>
      <Box sx={{ ...tableCardSx, py: 2 }}>
        <PropertyDocumentHub propertyId={propertyId} allowUpload />
      </Box>
    </Stack>
  );
}
