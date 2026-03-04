'use client';

/**
 * Document Preview Hook
 *
 * Manages state for the document preview modal and handles
 * actual file download (triggering browser download via anchor tag).
 *
 * Uses presigned URLs for both preview (inline) and download (attachment)
 * to avoid relying on public S3/Tigris URLs which may not be accessible.
 *
 * @module features/customers/hooks/use-document-preview
 */

import { useCallback, useState } from 'react';

import { useDocumentDownloadUrl } from './use-property-documents';
import type { PreviewDocument } from '../components/document-preview-modal';
import type { AggregatedDocument } from '../components/document-row';

import { showToast } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

interface UseDocumentPreviewReturn {
  /** The document currently being previewed (null if modal closed) */
  previewDocument: PreviewDocument | null;
  /** Whether the preview modal is open */
  isPreviewOpen: boolean;
  /** Whether the preview URL is being loaded */
  isPreviewLoading: boolean;
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
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const downloadMutation = useDocumentDownloadUrl();

  const openPreview = useCallback(
    (doc: AggregatedDocument) => {
      if (isPreviewLoading) return;
      setIsPreviewLoading(true);

      downloadMutation
        .mutateAsync({ documentUrl: doc.url })
        .then((viewUrl) => {
          setPreviewDocument({
            url: viewUrl,
            originalUrl: doc.url,
            fileName: doc.fileName,
            tag: doc.tag,
            propertyName: doc.propertyName,
          });
          setIsPreviewOpen(true);
        })
        .catch(() => {
          showToast.error('Failed to load document preview');
        })
        .finally(() => {
          setIsPreviewLoading(false);
        });
    },
    [downloadMutation, isPreviewLoading],
  );

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewDocument(null);
  }, []);

  const downloadToSystem = useCallback(
    async (doc: AggregatedDocument | PreviewDocument) => {
      try {
        // Use originalUrl (storage URL) for file key extraction when available,
        // since PreviewDocument.url may be a presigned view URL.
        const storageUrl = 'originalUrl' in doc ? doc.originalUrl : doc.url;

        const presignedUrl = await downloadMutation.mutateAsync({
          documentUrl: storageUrl,
          fileName: doc.fileName,
        });

        // Use anchor tag navigation instead of fetch() to avoid CORS issues.
        // The presigned URL has Content-Disposition: attachment, so the browser
        // will trigger a download without navigating away from the current page.
        const link = document.createElement('a');
        link.href = presignedUrl;
        link.download = doc.fileName;
        link.style.display = 'none';
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
    isPreviewLoading,
    openPreview,
    closePreview,
    downloadToSystem,
  };
}
