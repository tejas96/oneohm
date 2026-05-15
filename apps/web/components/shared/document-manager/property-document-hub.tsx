'use client';

import { Box, Chip, Skeleton, Typography } from '@mui/material';
import {
  DOCUMENT_ENTITY_TYPE_LABELS,
  DOCUMENT_ENTITY_TYPE_ORDER,
} from '@oneohm-epc/shared/constants';
import { DocumentEntityType } from '@oneohm-epc/shared/types';
import React, { useMemo, useState } from 'react';

import { DocumentManager } from './document-manager';
import { DocumentPreviewCarousel, type CarouselDocument } from './document-preview-carousel';
import type { ViewMode } from './types';

import { useDocumentsByProperty } from '@/components/features/documents/hooks';

interface PropertyDocumentHubProps {
  propertyId: string;
  allowUpload?: boolean;
  defaultUploadEntityType?: DocumentEntityType;
  defaultUploadEntityId?: string;
  readOnly?: boolean;
  className?: string;
}

export function PropertyDocumentHub({
  propertyId,
  allowUpload = false,
  defaultUploadEntityType,
  defaultUploadEntityId,
  readOnly = false,
  className,
}: PropertyDocumentHubProps): React.JSX.Element {
  const { data: documents, isLoading } = useDocumentsByProperty(propertyId);
  const [activeFilter, setActiveFilter] = useState<DocumentEntityType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Preview Carousel State
  const [previewDocs, setPreviewDocs] = useState<CarouselDocument[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Group documents by entityType
  const groupedDocs = useMemo(() => {
    if (!documents) return {};

    const groups: Partial<Record<DocumentEntityType, typeof documents>> = {};

    for (const doc of documents) {
      if (!groups[doc.entityType]) {
        groups[doc.entityType] = [];
      }
      groups[doc.entityType]!.push(doc);
    }

    return groups;
  }, [documents]);

  const activeEntityTypes = useMemo(() => {
    return DOCUMENT_ENTITY_TYPE_ORDER.filter(
      (type) => groupedDocs[type] && groupedDocs[type]!.length > 0,
    );
  }, [groupedDocs]);

  // Build the flat list of all visible documents for the carousel
  const handleOpenPreview = (docId: string) => {
    const flatList: CarouselDocument[] = [];

    // Ensure we iterate in the exact same order as displayed
    const displayTypes = activeFilter === 'ALL' ? activeEntityTypes : [activeFilter];

    for (const entityType of displayTypes) {
      const groupDocs = groupedDocs[entityType] || [];
      for (const d of groupDocs) {
        flatList.push({
          id: d.id,
          url: d.fileUrl,
          originalUrl: d.fileUrl,
          fileName: d.fileName,
          tag: d.tag,
          entityType: d.entityType,
          groupLabel: DOCUMENT_ENTITY_TYPE_LABELS[d.entityType],
        });
      }
    }

    const initialIndex = flatList.findIndex((d) => d.id === docId);
    if (initialIndex >= 0) {
      setPreviewDocs(flatList);
      setPreviewInitialIndex(initialIndex);
      setPreviewOpen(true);
    }
  };

  const handleDownload = (doc: CarouselDocument) => {
    // Standard download logic (can be adapted based on existing project utilities)
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={100} height={32} />
          <Skeleton variant="rounded" width={120} height={32} />
        </Box>
        <Skeleton variant="rounded" width="100%" height={150} />
      </Box>
    );
  }

  const isEmpty = !documents || documents.length === 0;

  if (isEmpty) {
    return (
      <Box className={className}>
        <DocumentManager
          entityType={defaultUploadEntityType || DocumentEntityType.PROPERTY}
          entityId={defaultUploadEntityId || propertyId}
          readOnly={readOnly}
          title="No documents yet"
        />
      </Box>
    );
  }

  const typesToRender = activeFilter === 'ALL' ? activeEntityTypes : [activeFilter];

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Filter Chips */}
      {activeEntityTypes.length > 1 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 2, pt: 2 }}>
          <Chip
            label="All Documents"
            onClick={() => setActiveFilter('ALL')}
            color={activeFilter === 'ALL' ? 'primary' : 'default'}
            variant={activeFilter === 'ALL' ? 'filled' : 'outlined'}
          />
          {activeEntityTypes.map((type) => (
            <Chip
              key={type}
              label={`${DOCUMENT_ENTITY_TYPE_LABELS[type]} (${groupedDocs[type]!.length})`}
              onClick={() => setActiveFilter(type)}
              color={activeFilter === type ? 'primary' : 'default'}
              variant={activeFilter === type ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      )}

      {/* Document Groups */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {typesToRender.map((entityType) => {
          const groupDocs = groupedDocs[entityType]!;
          if (!groupDocs.length) return null;

          return (
            <Box
              key={entityType}
              sx={{
                borderTop: 1,
                borderColor: 'divider',
                pt: 3,
                px: 2,
                '&:first-of-type': { borderTop: 0, pt: 0 },
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, fontSize: '1.125rem', fontWeight: 600, color: 'text.primary' }}
              >
                {DOCUMENT_ENTITY_TYPE_LABELS[entityType]}
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}
                >
                  ({groupDocs.length})
                </Typography>
              </Typography>

              <Box sx={{ mt: -2 }}>
                {/* We use DocumentManager here but in readOnly mode so it doesn't show its own upload button.
                    We will implement a global upload button later if needed, or rely on specific tabs. */}
                <DocumentManager
                  entityType={entityType}
                  entityId={groupDocs[0]?.entityId || propertyId}
                  documents={groupDocs}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  readOnly={readOnly || !allowUpload}
                  onPreview={(doc) => handleOpenPreview(doc.id)}
                  className="-mx-2"
                />
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Cross-Group Preview Carousel */}
      <DocumentPreviewCarousel
        documents={previewDocs}
        initialIndex={previewInitialIndex}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDownload={handleDownload}
      />
    </Box>
  );
}
