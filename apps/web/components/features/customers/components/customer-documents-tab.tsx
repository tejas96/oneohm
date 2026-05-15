'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import {
  Box,
  Button,
  MenuItem,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DocumentEntityType } from '@oneohm-epc/shared/types';
import { useCallback, useMemo, useState } from 'react';

import type { CustomerPropertyResponse } from '../hooks';
import { DocumentPreviewModal } from './document-preview-modal';

import {
  useDocumentsByEntityBatch,
  useDeleteDocument,
} from '@/components/features/documents/hooks';
import { PropertyDocumentHub, type ViewMode } from '@/components/shared/document-manager';
import { DocumentGridItem } from '@/components/shared/document-manager/document-grid-item';
import { DocumentListItem } from '@/components/shared/document-manager/document-list-item';
import { useDocumentActions } from '@/components/shared/document-manager/use-document-actions';
import { EmptyState } from '@/components/shared/feedback/empty-state';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';

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
  if (propertyFilter !== 'all') {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PropertyFilterSelect
          properties={properties}
          value={propertyFilter}
          onChange={onPropertyFilterChange}
        />
        <PropertyDocumentHub
          propertyId={propertyFilter}
          allowUpload
          defaultUploadEntityType={DocumentEntityType.PROPERTY}
          defaultUploadEntityId={propertyFilter}
        />
      </Box>
    );
  }

  return (
    <AllPropertiesDocumentsView
      properties={properties}
      propertyFilter={propertyFilter}
      onPropertyFilterChange={onPropertyFilterChange}
    />
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
      sx={{ width: 200 }}
    >
      <MenuItem value="all">All Properties</MenuItem>
      {properties.map((p) => (
        <MenuItem key={p.id} value={p.id}>
          {p.propertyName || p.address || 'Unnamed'}
        </MenuItem>
      ))}
    </TextField>
  );
}

function AllPropertiesDocumentsView({
  properties,
  propertyFilter,
  onPropertyFilterChange,
}: CustomerDocumentsTabProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const propertyIds = useMemo(() => properties.map((p) => p.id), [properties]);

  const propertyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) {
      map.set(p.id, p.propertyName || p.address || 'Unnamed');
    }
    return map;
  }, [properties]);

  const { data: documents, isLoading } = useDocumentsByEntityBatch(
    DocumentEntityType.PROPERTY,
    propertyIds,
  );
  const deleteMutation = useDeleteDocument();

  const {
    previewDoc,
    docToDelete,
    openPreview,
    closePreview,
    downloadDocument,
    requestDelete,
    clearDelete,
  } = useDocumentActions();

  const confirmDelete = useCallback(async () => {
    if (!docToDelete || !('id' in docToDelete)) return;
    try {
      await deleteMutation.mutateAsync({ id: docToDelete.id, fileUrl: docToDelete.fileUrl });
      showToast.success('Document deleted');
    } catch {
      showToast.error('Failed to delete document');
    } finally {
      clearDelete();
    }
  }, [docToDelete, deleteMutation, clearDelete]);

  const allDocs = documents ?? [];
  const deleteFileName = docToDelete?.fileName ?? '';

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PropertyFilterSelect
            properties={properties}
            value={propertyFilter}
            onChange={onPropertyFilterChange}
          />
          {!isLoading && allDocs.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {allDocs.length} document{allDocs.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_e, val) => {
            if (val) setViewMode(val as ViewMode);
          }}
          size="small"
        >
          <ToggleButton value="list" aria-label="List view" sx={{ px: 0.75, py: 0.5 }}>
            <ViewListIcon sx={{ fontSize: 18 }} />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="Grid view" sx={{ px: 0.75, py: 0.5 }}>
            <ViewModuleIcon sx={{ fontSize: 18 }} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
        </Box>
      )}

      {!isLoading && allDocs.length === 0 && (
        <EmptyState
          icon={<InsertDriveFileIcon sx={{ width: '100%', height: '100%' }} />}
          title="No documents yet"
          description={
            properties.length > 0
              ? 'Select a specific property to upload documents.'
              : 'Add a property first to upload documents.'
          }
        />
      )}

      {!isLoading && allDocs.length > 0 && viewMode === 'list' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {allDocs.map((doc) => (
            <DocumentListItem
              key={doc.id}
              document={doc}
              onPreview={openPreview}
              onDownload={downloadDocument}
              onDelete={requestDelete}
              isDeleting={deleteMutation.isPending}
              extraChip={propertyNameMap.get(doc.entityId) ?? 'Unknown'}
            />
          ))}
        </Box>
      )}

      {!isLoading && allDocs.length > 0 && viewMode === 'grid' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {allDocs.map((doc) => (
            <DocumentGridItem
              key={doc.id}
              document={doc}
              onPreview={openPreview}
              onDownload={downloadDocument}
              onDelete={requestDelete}
            />
          ))}
        </Box>
      )}

      {/* Preview */}
      <DocumentPreviewModal
        document={previewDoc}
        open={!!previewDoc}
        onOpenChange={() => closePreview()}
        onDownload={downloadDocument}
      />

      {/* Delete Confirmation — MUI Dialog */}
      <MUIDialog open={!!docToDelete} onOpenChange={(open) => !open && clearDelete()} size="sm">
        <MUIDialogHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: 'error.light',
              }}
            >
              <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 20 }} />
            </Box>
            <Box>
              <MUIDialogTitle>Delete Document</MUIDialogTitle>
              <MUIDialogDescription>This action cannot be undone.</MUIDialogDescription>
            </Box>
          </Box>
        </MUIDialogHeader>
        <MUIDialogBody>
          <Typography variant="body2">
            Are you sure you want to delete &quot;{deleteFileName}&quot;?
          </Typography>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => clearDelete()}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </Box>
  );
}
