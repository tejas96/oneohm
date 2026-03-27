'use client';

import { useCallback, useState } from 'react';

import type { DraftDocument } from './types';

import type { PreviewDocument } from '@/components/features/customers/components/document-preview-modal';
import type { DocumentRecord } from '@/lib/api/documents';
import { getDownloadUrl } from '@/lib/api/storage';
import { extractFileKey, isPreviewableFile } from '@/lib/utils';

type AnyDocItem = DocumentRecord | DraftDocument;

export function useDocumentActions() {
  const [previewDoc, setPreviewDoc] = useState<PreviewDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<AnyDocItem | null>(null);

  const openPreview = useCallback(async (item: AnyDocItem) => {
    const fileUrl = item.fileUrl;
    const fileName = item.fileName;

    if (!isPreviewableFile(fileName)) {
      await triggerDownload(fileUrl, fileName);
      return;
    }

    try {
      const fileKey = extractFileKey(fileUrl);
      const presignedUrl = await getDownloadUrl(fileKey);
      setPreviewDoc({
        url: presignedUrl,
        originalUrl: fileUrl,
        fileName,
        tag: item.tag,
        propertyName: '',
      });
    } catch {
      setPreviewDoc({
        url: fileUrl,
        originalUrl: fileUrl,
        fileName,
        tag: item.tag,
        propertyName: '',
      });
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewDoc(null);
  }, []);

  const downloadDocument = useCallback(async (item: AnyDocItem | PreviewDocument) => {
    const fileUrl = 'originalUrl' in item ? item.originalUrl : item.fileUrl;
    const fileName = item.fileName;
    await triggerDownload(fileUrl, fileName);
  }, []);

  const requestDelete = useCallback((item: AnyDocItem) => {
    setDocToDelete(item);
  }, []);

  const clearDelete = useCallback(() => {
    setDocToDelete(null);
  }, []);

  return {
    previewDoc,
    docToDelete,
    openPreview,
    closePreview,
    downloadDocument,
    requestDelete,
    clearDelete,
  };
}

async function triggerDownload(fileUrl: string, fileName: string): Promise<void> {
  try {
    const fileKey = extractFileKey(fileUrl);
    const url = await getDownloadUrl(fileKey, fileName);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }
}
