'use client';

/**
 * Document Row Component
 *
 * Displays a single document with thumbnail/icon, file info, property badge,
 * and action buttons (preview, download, delete).
 * Used in the Documents tab of the Customer Detail page.
 *
 * @module features/customers/components/document-row
 */

import { Download, Eye, FileText, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { getDocumentTypeLabel } from '../constants';

import { formatFileSize } from '@/components/shared/document-collector/constants';
import { Badge, Button } from '@/components/ui';
import { cn, isImageFile } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AggregatedDocument {
  url: string;
  fileName: string;
  tag: string;
  fileSize?: number;
  uploadedAt?: string;
  isLoanDoc: boolean;
  propertyId: string;
  propertyName: string;
}

interface DocumentRowProps {
  document: AggregatedDocument;
  onPreview: (doc: AggregatedDocument) => void;
  onDownload: (doc: AggregatedDocument) => void;
  onDelete: (doc: AggregatedDocument) => void;
  isDeleting?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDocDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Thumbnail for image files, icon fallback for non-images */
function DocumentThumbnail({
  doc,
}: {
  doc: AggregatedDocument;
}): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const isImage = isImageFile(doc.fileName);

  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  if (isImage && !imgError) {
    return (
      <div className="flex size-container-sm shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-light bg-background-secondary">
        <img
          src={doc.url}
          alt={doc.fileName}
          className="size-full object-cover"
          onError={handleError}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex size-container-sm shrink-0 items-center justify-center rounded-lg bg-background-secondary">
      <FileText className="size-icon text-foreground-muted" />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DocumentRow({
  document: doc,
  onPreview,
  onDownload,
  onDelete,
  isDeleting = false,
}: DocumentRowProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border-light p-3 transition-colors',
        'hover:bg-background-secondary',
      )}
    >
      {/* Left: Thumbnail/Icon + File Info */}
      <div className="flex items-center gap-3 overflow-hidden">
        <DocumentThumbnail doc={doc} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {doc.fileName}
            </p>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {doc.propertyName}
            </Badge>
            <Badge variant="outline" className="shrink-0 text-xs">
              {getDocumentTypeLabel(doc.tag)}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {doc.fileSize ? formatFileSize(doc.fileSize) : 'Unknown size'}
            {doc.uploadedAt && (
              <>
                {' \u00B7 '}
                Uploaded {formatDocDate(doc.uploadedAt)}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-1 ml-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPreview(doc)}
          aria-label={`Preview ${doc.fileName}`}
        >
          <Eye className="size-icon-sm" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDownload(doc)}
          aria-label={`Download ${doc.fileName}`}
        >
          <Download className="size-icon-sm" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(doc)}
          disabled={isDeleting}
          aria-label={`Delete ${doc.fileName}`}
          className="text-foreground-muted hover:text-error"
        >
          <Trash2 className="size-icon-sm" />
        </Button>
      </div>
    </div>
  );
}
