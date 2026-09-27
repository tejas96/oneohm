'use client';

import PrintIcon from '@mui/icons-material/Print';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Portal,
  Skeleton,
  Typography,
} from '@mui/material';
import { DOCUMENT_ENTITY_TYPE_LABELS, DOCUMENT_ENTITY_TYPE_ORDER } from '@tejas96/shared/constants';
import { DocumentEntityType } from '@tejas96/shared/types';
import React, { useMemo, useState } from 'react';

import { DocumentManager } from './document-manager';
import { DocumentPreviewCarousel, type CarouselDocument } from './document-preview-carousel';
import type { ManagerSelection, ViewMode } from './types';
import { usePrintDocuments } from './use-print-documents';
import { isPrintableFile } from './utils';

import { useDocumentsByProperty } from '@/components/features/documents/hooks';
import type { DocumentRecord } from '@/lib/api/documents';

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

  // Picking documents to print: ids in the order they were ticked; printing follows the page order.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const { print, printing } = usePrintDocuments();

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

  const typesShown = activeFilter === 'ALL' ? activeEntityTypes : [activeFilter];
  /** What is on the page, top to bottom: the order pages come out of the printer. */
  const shownDocs: DocumentRecord[] = typesShown.flatMap((type) => groupedDocs[type] ?? []);
  const printableShown = shownDocs.filter(isPrintableFile);
  const selectedInOrder = shownDocs.filter((d) => selected.has(d.id));

  const toggleMany = (docs: DocumentRecord[], on: boolean): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const d of docs) {
        if (on) next.add(d.id);
        else next.delete(d.id);
      }
      return next;
    });

  const selection: ManagerSelection = {
    isSelected: (id) => selected.has(id),
    canSelect: isPrintableFile,
    onToggle: (doc) => toggleMany([doc], !selected.has(doc.id)),
  };

  // A pick the new filter hides is dropped: what is counted is what prints.
  const changeFilter = (filter: DocumentEntityType | 'ALL'): void => {
    setActiveFilter(filter);
    if (filter === 'ALL') return;
    const stillShown = new Set((groupedDocs[filter] ?? []).map((d) => d.id));
    setSelected((prev) => new Set([...prev].filter((id) => stillShown.has(id))));
  };

  const stopSelecting = (): void => {
    setSelecting(false);
    setSelected(new Set());
  };

  const runPrint = async (): Promise<void> => {
    if (await print(selectedInOrder.map((d) => d.id))) stopSelecting();
  };

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
        {/*
         * `title` is a NOUN — `DocumentManager` renders it as
         * `No ${title.toLowerCase()}`. Passing the finished sentence here
         * produced "No no documents yet" on the customer, project and property
         * document tabs. Omitting it uses the component's own default.
         */}
        <DocumentManager
          entityType={defaultUploadEntityType || DocumentEntityType.PROPERTY}
          entityId={defaultUploadEntityId || propertyId}
          readOnly={readOnly}
        />
      </Box>
    );
  }

  const typesToRender = typesShown;

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Filter chips, with Select to print at the end of the row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, px: 2, pt: 2 }}>
        {activeEntityTypes.length > 1 && (
          <>
            <Chip
              label="All Documents"
              onClick={() => changeFilter('ALL')}
              color={activeFilter === 'ALL' ? 'primary' : 'default'}
              variant={activeFilter === 'ALL' ? 'filled' : 'outlined'}
            />
            {activeEntityTypes.map((type) => (
              <Chip
                key={type}
                label={`${DOCUMENT_ENTITY_TYPE_LABELS[type]} (${groupedDocs[type]!.length})`}
                onClick={() => changeFilter(type)}
                color={activeFilter === type ? 'primary' : 'default'}
                variant={activeFilter === type ? 'filled' : 'outlined'}
              />
            ))}
          </>
        )}
        {!selecting && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => setSelecting(true)}
            disabled={printableShown.length === 0}
            sx={{ ml: 'auto' }}
          >
            Select to print
          </Button>
        )}
      </Box>

      {/* Document Groups (room at the end while picking, so the bar never covers the last row) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: selecting ? 10 : 0 }}>
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
                {selecting &&
                  (() => {
                    const printable = groupDocs.filter(isPrintableFile);
                    if (printable.length === 0) return null;
                    const all = printable.every((d) => selected.has(d.id));
                    return (
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => toggleMany(printable, !all)}
                        sx={{ ml: 1.5, fontWeight: 400, verticalAlign: 'baseline' }}
                      >
                        {all ? 'Clear group' : 'Select group'}
                      </Link>
                    );
                  })()}
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
                  selection={selecting ? selection : undefined}
                  className="-mx-2"
                />
              </Box>
            </Box>
          );
        })}
      </Box>

      {/*
       * Print selection bar, floating at the bottom of the window while picking.
       * Fixed in a portal, not sticky: the site page wraps this hub in a card
       * with overflow hidden, which stops sticky from working there.
       */}
      {selecting ? (
        <Portal>
          <Box
            role="region"
            aria-label="Print selection"
            sx={{
              position: 'fixed',
              // Above the round help button that sits bottom-right on phones.
              bottom: { xs: 88, md: 16 },
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(720px, calc(100% - 32px))',
              zIndex: 1200,
              px: 2,
              py: 1,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              borderRadius: 2,
              border: 1,
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
              boxShadow: 2,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedInOrder.length === 0
                ? 'Pick documents to print'
                : `${selectedInOrder.length} selected`}
            </Typography>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() =>
                toggleMany(printableShown, selectedInOrder.length < printableShown.length)
              }
            >
              {selectedInOrder.length < printableShown.length ? 'Select all' : 'Clear all'}
            </Link>
            <Box sx={{ flex: 1 }} />
            <Button variant="text" color="inherit" onClick={stopSelecting} disabled={printing}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={printing ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />}
              disabled={selectedInOrder.length === 0 || printing}
              onClick={() => void runPrint()}
            >
              {printing
                ? 'Preparing…'
                : `Print${selectedInOrder.length > 0 ? ` ${selectedInOrder.length}` : ''}`}
            </Button>
          </Box>
        </Portal>
      ) : null}

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
