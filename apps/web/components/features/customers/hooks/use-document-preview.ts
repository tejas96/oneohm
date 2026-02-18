'use client';

/**
 * Document Preview Hook
 *
 * Manages state for the document preview modal and handles
 * actual file download (triggering browser download via anchor tag).
 *
 * @module features/customers/hooks/use-document-preview
 */

import { useCallback, useState } from 'react';

import { useDocumentDownloadUrl } from './use-property-documents';

import type { AggregatedDocument } from '../components/document-row';
import type { PreviewDocument } from '../components/document-preview-modal';

import { showToast } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

interface UseDocumentPreviewReturn {
  /** The document currently being previewed (null if modal closed) */
  previewDocument: PreviewDocument | null;
  /** Whether the preview modal is open */
  isPreviewOpen: boolean;
  /** Open preview modal for a document */
  openPreview: (doc: AggregatedDocument) => void;
  /** Close the preview modal */
  closePreview: () => void;
  /** Trigger actual file download to user's system */
  downloadToSystem: (doc: AggregatedDocument | PreviewDocument) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDocumentPreview(): UseDocumentPreviewReturn {
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const downloadMutation = useDocumentDownloadUrl();

  const openPreview = useCallback((doc: AggregatedDocument) => {
    setPreviewDocument({
      url: doc.url,
      fileName: doc.fileName,
      tag: doc.tag,
      propertyName: doc.propertyName,
    });
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewDocument(null);
  }, []);

  const downloadToSystem = useCallback(
    async (doc: AggregatedDocument | PreviewDocument) => {
      try {
        const presignedUrl = await downloadMutation.mutateAsync({
          documentUrl: doc.url,
          fileName: doc.fileName,
        });

        // Create a temporary anchor to trigger browser download
        const link = document.createElement('a');
        link.href = presignedUrl;
        link.download = doc.fileName;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        showToast.error('Failed to download document');
      }
    },
    [downloadMutation],
  );

  return {
    previewDocument,
    isPreviewOpen,
    openPreview,
    closePreview,
    downloadToSystem,
  };
}
