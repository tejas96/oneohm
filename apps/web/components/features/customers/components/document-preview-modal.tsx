'use client';

/**
 * Document Preview Modal
 *
 * Full-screen-style modal for previewing document files.
 * Supports images (rendered via <img>) and PDFs (rendered via <iframe>).
 * Falls back to a "preview not available" message with download option.
 *
 * @module features/customers/components/document-preview-modal
 */

import { Download, FileText, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { getDocumentTypeLabel } from '../constants';

import { Badge, Button } from '@/components/ui';
import {
  cn,
  getFileExtension,
  isImageFile,
  isPdfFile,
  isPreviewableFile,
} from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PreviewDocument {
  url: string;
  fileName: string;
  tag: string;
  propertyName: string;
}

interface DocumentPreviewModalProps {
  document: PreviewDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (doc: PreviewDocument) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentPreviewModal({
  document: doc,
  open,
  onOpenChange,
  onDownload,
}: DocumentPreviewModalProps): React.JSX.Element | null {
  const [imageError, setImageError] = useState(false);

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

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  if (!open || !doc) return null;

  const ext = getFileExtension(doc.fileName);
  const canPreview = isPreviewableFile(doc.fileName) && !imageError;

  return (
    <div className="fixed inset-0 z-modal flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-normal">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <FileText className="size-icon shrink-0 text-white/70" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {doc.fileName}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {doc.propertyName}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-xs text-white/70">
                {getDocumentTypeLabel(doc.tag)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 ml-4">
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

      {/* Content */}
      {/* Click backdrop to close */}
      <div
        className="flex flex-1 items-center justify-center overflow-auto p-4"
        onClick={handleClose}
        role="presentation"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="presentation"
          className={cn(
            'relative',
            isImageFile(doc.fileName) && 'max-h-full max-w-full',
            isPdfFile(doc.fileName) && 'h-full w-full max-w-4xl',
          )}
        >
          {/* Image Preview */}
          {isImageFile(doc.fileName) && !imageError && (
            <img
              src={doc.url}
              alt={doc.fileName}
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-lg"
              onError={handleImageError}
            />
          )}

          {/* PDF Preview */}
          {isPdfFile(doc.fileName) && (
            <iframe
              src={doc.url}
              title={doc.fileName}
              className="h-[80vh] w-full rounded-lg border-0 bg-white shadow-lg"
            />
          )}

          {/* Unsupported / Error Fallback */}
          {(!canPreview || (!isImageFile(doc.fileName) && !isPdfFile(doc.fileName))) && (
            <div className="flex flex-col items-center gap-4 rounded-lg bg-background p-8 text-center shadow-lg">
              <div className="flex size-container-lg items-center justify-center rounded-lg bg-background-secondary">
                <FileText className="size-icon-lg text-foreground-muted" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Preview not available
                </p>
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
    </div>
  );
}
