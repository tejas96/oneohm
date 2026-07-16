'use client';

import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { Box, MenuItem, TextField } from '@mui/material';
import { DocumentEntityType } from '@tejas96/shared/types';
import React from 'react';

import type { CustomerPropertyResponse } from '../hooks';

import { PropertyDocumentHub } from '@/components/shared/document-manager';
import { EmptyState } from '@/components/shared/feedback/empty-state';

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
      <Box sx={{ p: 2 }}>
        <EmptyState
          icon={<InsertDriveFileIcon sx={{ width: '100%', height: '100%' }} />}
          title="No properties yet"
          description="Add a property first to upload and manage documents."
        />
      </Box>
    );
  }

  // Fallback to primary/first property if propertyFilter is invalid or unset
  const activePropertyId = properties.some((p) => p.id === propertyFilter)
    ? propertyFilter
    : (properties.find((p) => p.isPrimary)?.id ?? properties[0]?.id ?? '');

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PropertyFilterSelect
          properties={properties}
          value={activePropertyId}
          onChange={onPropertyFilterChange}
        />
      </Box>
      <PropertyDocumentHub
        propertyId={activePropertyId}
        allowUpload
        defaultUploadEntityType={DocumentEntityType.PROPERTY}
        defaultUploadEntityId={activePropertyId}
      />
    </Box>
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
      sx={{ width: 220 }}
    >
      {properties.map((p) => (
        <MenuItem key={p.id} value={p.id}>
          {p.propertyName || p.address || 'Unnamed'}
        </MenuItem>
      ))}
    </TextField>
  );
}
