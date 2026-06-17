import { DOCUMENT_ENTITY_TYPE_LABELS } from '@tejas96/shared/constants';
import { DocumentEntityType } from '@tejas96/shared/types';
import { ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { getTagLabel } from './utils';

import { Badge, Button } from '@/components/ui';
import { useBodyScrollLock } from '@/lib/hooks';
import { cn, getFileExtension, isImageFile, isPdfFile, isPreviewableFile } from '@/lib/utils';

export interface CarouselDocument {
  id: string;
  url: string;
  originalUrl: string;
  fileName: string;
  tag: string;
  entityType: DocumentEntityType;
  groupLabel: string;
}

interface DocumentPreviewCarouselProps {
  documents: CarouselDocument[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (doc: CarouselDocument) => void;
}

export function DocumentPreviewCarousel({
  documents,
  initialIndex,
  open,
  onOpenChange,
  onDownload,
}: DocumentPreviewCarouselProps): React.JSX.Element | null {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);

  useBodyScrollLock(open);

  // Sync internal state with external prop changes when opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setImageError(false);
    }
  }, [open, initialIndex]);

  const doc = documents[currentIndex];

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setImageError(false);
  }, [onOpenChange]);

  const handleDownload = useCallback(() => {
    if (doc) onDownload(doc);
  }, [doc, onDownload]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handlePrevious = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
      setImageError(false);
    },
    [documents.length],
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
      setImageError(false);
    },
    [documents.length],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose, handlePrevious, handleNext]);

  if (!open || !doc) return null;

  const ext = getFileExtension(doc.fileName);
  const canPreview = isPreviewableFile(doc.fileName) && !imageError;
  const totalCount = documents.length;

  return (
    <div className="fixed inset-0 z-modal flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-normal">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <FileText className="size-icon shrink-0 text-white/70" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{doc.fileName}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {DOCUMENT_ENTITY_TYPE_LABELS[doc.entityType]}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-xs text-white/70">
                {getTagLabel(doc.tag)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 ml-4">
          <div className="text-white/60 text-sm font-medium">
            {currentIndex + 1} of {totalCount}
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDownload}
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label={`Download ${doc.fileName}`}
            >
              <Download className="size-icon-sm" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close preview"
            >
              <X className="size-icon-sm" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Previous Button Overlay */}
        {totalCount > 1 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-24 z-10 flex items-center justify-start pl-4 group cursor-pointer"
            onClick={handlePrevious}
          >
            <div className="bg-black/20 group-hover:bg-black/60 rounded-full p-2 transition-colors text-white/50 group-hover:text-white/100 backdrop-blur-sm">
              <ChevronLeft className="w-8 h-8" />
            </div>
          </div>
        )}

        {/* Click backdrop to close */}
        <div
          className="flex flex-1 items-center justify-center overflow-auto p-4 md:px-24"
          onClick={handleClose}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            className={cn(
              'relative transition-opacity duration-200',
              isImageFile(doc.fileName) && 'max-h-full max-w-full',
              isPdfFile(doc.fileName) && 'h-full w-full max-w-4xl',
            )}
          >
            {/* Image Preview */}
            {isImageFile(doc.fileName) && !imageError && (
              <img
                key={doc.id}
                src={doc.url}
                alt={doc.fileName}
                className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-sm animate-in fade-in zoom-in-95 duration-200"
                onError={handleImageError}
              />
            )}

            {/* PDF Preview */}
            {isPdfFile(doc.fileName) && (
              <iframe
                key={doc.id}
                src={doc.url}
                title={doc.fileName}
                className="h-[85vh] w-full rounded-lg border-0 bg-white shadow-sm animate-in fade-in zoom-in-95 duration-200"
              />
            )}

            {/* Unsupported / Error Fallback */}
            {(!canPreview || (!isImageFile(doc.fileName) && !isPdfFile(doc.fileName))) && (
              <div className="flex flex-col items-center gap-4 rounded-lg bg-background p-8 text-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="flex size-container-lg items-center justify-center rounded-lg bg-background-secondary">
                  <FileText className="size-icon-lg text-foreground-muted" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Preview not available</p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {imageError
                      ? 'Failed to load the image'
                      : `Cannot preview .${ext} files in the browser`}
                  </p>
                </div>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="mr-1.5 size-icon-xs" />
                  Download to view
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Next Button Overlay */}
        {totalCount > 1 && (
          <div
            className="absolute right-0 top-0 bottom-0 w-24 z-10 flex items-center justify-end pr-4 group cursor-pointer"
            onClick={handleNext}
          >
            <div className="bg-black/20 group-hover:bg-black/60 rounded-full p-2 transition-colors text-white/50 group-hover:text-white/100 backdrop-blur-sm">
              <ChevronRight className="w-8 h-8" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
