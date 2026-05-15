'use client';

import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { Box, Button, Skeleton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DocumentCategory } from '@oneohm-epc/shared/types';
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { DocumentGridItem } from './document-grid-item';
import { DocumentListItem } from './document-list-item';
import type { DocumentManagerProps, DraftDocument, ViewMode } from './types';
import { UploadDialog } from './upload-dialog';
import { useDocumentActions } from './use-document-actions';

import { DocumentPreviewModal } from '@/components/features/customers/components/document-preview-modal';
import {
  useDocuments,
  useDeleteDocument,
  useUploadDocument,
} from '@/components/features/documents/hooks';
import { EmptyState } from '@/components/shared/feedback/empty-state';
import {
  MUIDialog,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogDescription,
  MUIDialogBody,
  MUIDialogFooter,
  showToast,
} from '@/components/ui';
import type { DocumentRecord } from '@/lib/api/documents';
import { FileCategory, uploadFile } from '@/lib/api/storage';

export function DocumentManager({
  entityType,
  entityId,
  title,
  description,
  readOnly = false,
  className,
  onDraftDocumentsChange,
  onPreview,
  documents: externalDocuments,
  viewMode: controlledViewMode,
  onViewModeChange,
}: DocumentManagerProps & {
  onPreview?: (doc: DocumentRecord | DraftDocument) => void;
}): React.JSX.Element {
  const isDraftMode = !entityId;

  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid');
  const viewMode = controlledViewMode ?? internalViewMode;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draftDocs, setDraftDocs] = useState<DraftDocument[]>([]);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, nextView: ViewMode | null) => {
    if (nextView !== null) {
      if (onViewModeChange) {
        onViewModeChange(nextView);
      } else {
        setInternalViewMode(nextView);
      }
    }
  };

  useEffect(() => {
    if (isDraftMode) {
      onDraftDocumentsChange?.(draftDocs);
    }
  }, [isDraftMode, draftDocs, onDraftDocumentsChange]);

  const { data: apiDocuments, isLoading: isQueryLoading } = useDocuments(
    entityType,
    isDraftMode || !!externalDocuments ? undefined : entityId,
  );

  const isLoading = !externalDocuments && isQueryLoading;
  const deleteMutation = useDeleteDocument();
  const uploadMutation = useUploadDocument();

  const {
    previewDoc,
    docToDelete,
    openPreview,
    closePreview,
    requestDelete,
    clearDelete,
    downloadDocument,
  } = useDocumentActions();

  const documents = externalDocuments ?? apiDocuments ?? [];

  const handleUploadComplete = useCallback(
    async (params: {
      file: File;
      tag: string;
      category: DocumentCategory;
      onProgress: (percent: number) => void;
    }) => {
      const { file, tag, category, onProgress } = params;

      const uploadResult = await uploadFile({
        file,
        category: FileCategory.DOCUMENT,
        entityId: entityId ?? 'draft',
        entityType: entityType,
        subCategory: tag,
        onProgress: (p) => onProgress(p.percent),
      });

      if (isDraftMode) {
        const draft: DraftDocument = {
          id: uuidv4(),
          file,
          fileName: file.name,
          fileUrl: uploadResult.publicUrl,
          fileKey: uploadResult.fileKey,
          fileSizeBytes: file.size,
          mimeType: file.type,
          tag,
          category,
          status: 'success',
          progress: 100,
        };
        setDraftDocs((prev) => [...prev, draft]);
        showToast.success('File uploaded');
        return;
      }

      await uploadMutation.mutateAsync({
        entityType,
        entityId: entityId,
        category,
        tag,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.publicUrl,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });

      showToast.success('Document uploaded');
    },
    [entityType, entityId, isDraftMode, uploadMutation],
  );

  const confirmDelete = useCallback(async () => {
    if (!docToDelete) return;

    if ('status' in docToDelete) {
      setDraftDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));
      clearDelete();
      showToast.success('Document removed');
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: docToDelete.id, fileUrl: docToDelete.fileUrl });
      showToast.success('Document deleted');
    } catch {
      showToast.error('Failed to delete document');
    } finally {
      clearDelete();
    }
  }, [docToDelete, deleteMutation, clearDelete]);

  const deleteFileName = docToDelete?.fileName ?? '';

  if (isLoading && !isDraftMode) {
    return (
      <Box className={className} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  const allItems = isDraftMode ? draftDocs : documents;
  const isEmpty = allItems.length === 0;

  if (isEmpty && !readOnly) {
    return (
      <Box className={className}>
        <EmptyState
          icon={<InsertDriveFileIcon sx={{ width: '100%', height: '100%' }} />}
          title={title ? `No ${title.toLowerCase()}` : 'No documents yet'}
          description={
            description ??
            'Upload documents like electricity bills, site photos, or other paperwork.'
          }
          action={{
            label: 'Upload Document',
            onClick: () => setUploadOpen(true),
            icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,
          }}
        />
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUpload={handleUploadComplete}
          showEntityTypeSelector={!entityId}
        />
      </Box>
    );
  }

  if (isEmpty && readOnly) {
    return (
      <Box className={className}>
        <EmptyState
          icon={<InsertDriveFileIcon sx={{ width: '100%', height: '100%' }} />}
          title="No documents"
          description="No documents have been uploaded yet."
        />
      </Box>
    );
  }

  return (
    <Box className={className}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {allItems.length} document{allItems.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="list" aria-label="List view" sx={{ px: 0.75, py: 0.5 }}>
                <ViewListIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value="grid" aria-label="Grid view" sx={{ px: 0.75, py: 0.5 }}>
                <ViewModuleIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>

            {!readOnly && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setUploadOpen(true)}
              >
                Upload
              </Button>
            )}
          </Box>
        </Box>

        {/* Document List */}
        {viewMode === 'list' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {allItems.map((item) => (
              <DocumentListItem
                key={item.id}
                document={item}
                onPreview={(doc: DocumentRecord | DraftDocument) =>
                  onPreview ? onPreview(doc) : void openPreview(doc)
                }
                onDownload={(doc: DocumentRecord | DraftDocument) => void downloadDocument(doc)}
                onDelete={readOnly ? undefined : requestDelete}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </Box>
        )}

        {/* Document Grid */}
        {viewMode === 'grid' && (
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
            {allItems.map((item) => (
              <DocumentGridItem
                key={item.id}
                document={item}
                onPreview={(doc: DocumentRecord | DraftDocument) =>
                  onPreview ? onPreview(doc) : void openPreview(doc)
                }
                onDownload={(doc: DocumentRecord | DraftDocument) => void downloadDocument(doc)}
                onDelete={readOnly ? undefined : requestDelete}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Upload Dialog */}
      {!readOnly && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUpload={handleUploadComplete}
          showEntityTypeSelector={!entityId}
        />
      )}

      {/* Preview Modal — uses existing legacy component (will be migrated separately) */}
      <DocumentPreviewModal
        document={previewDoc}
        open={!!previewDoc}
        onOpenChange={() => closePreview()}
        onDownload={downloadDocument}
      />

      {/* Delete Confirmation */}
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
