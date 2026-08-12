'use client';

import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import { Box, MenuItem, Stack, TextField } from '@mui/material';
import { DocumentEntityType } from '@tejas96/shared/types';
import React from 'react';

import { DetailCard, EmptyPane, SectionHeading } from '../customer-detail/primitives';
import type { CustomerPropertyResponse } from '../hooks';

import { PropertyDocumentHub } from '@/components/shared/document-manager';

interface CustomerDocumentsTabProps {
  properties: CustomerPropertyResponse[];
  propertyFilter: string;
  onPropertyFilterChange: (value: string) => void;
}

export function CustomerDocumentsTab({
  properties,
  propertyFilter,
  onPropertyFilterChange,
}: CustomerDocumentsTabProps): React.JSX.Element {
  if (properties.length === 0) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<HomeWorkOutlinedIcon />}
          title="No sites yet"
          description="Documents hang off a site — bills, ID proofs, survey photos. Add a site first and the uploader appears here."
        />
      </DetailCard>
    );
  }

  // Fallback to primary/first property if propertyFilter is invalid or unset
  const activePropertyId = properties.some((p) => p.id === propertyFilter)
    ? propertyFilter
    : (properties.find((p) => p.isPrimary)?.id ?? properties[0]?.id ?? '');

  return (
    <Stack gap={1.5}>
      <SectionHeading
        sx={{ mb: 0 }}
        action={
          <PropertyFilterSelect
            properties={properties}
            value={activePropertyId}
            onChange={onPropertyFilterChange}
          />
        }
      >
        Documents by site
      </SectionHeading>

      {/*
       * `PropertyDocumentHub` is shared with the property and project pages and
       * brings its own surfaces, so it is left to paint itself rather than
       * being wrapped in a card that would double the chrome.
       */}
      <Box sx={{ minWidth: 0 }}>
        <PropertyDocumentHub
          propertyId={activePropertyId}
          allowUpload
          defaultUploadEntityType={DocumentEntityType.PROPERTY}
          defaultUploadEntityId={activePropertyId}
        />
      </Box>
    </Stack>
  );
}

function PropertyFilterSelect({
  properties,
  value,
  onChange,
}: {
  properties: CustomerPropertyResponse[];
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <TextField
      select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      aria-label="Filter documents by site"
      sx={{ width: 240 }}
    >
      {properties.map((p) => (
        <MenuItem key={p.id} value={p.id}>
          {p.propertyName || p.address || 'Unnamed site'}
        </MenuItem>
      ))}
    </TextField>
  );
}
