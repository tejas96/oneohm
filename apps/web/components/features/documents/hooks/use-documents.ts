'use client';

/**
 * Document feature hooks — re-exports from FDAL resource layer.
 * Single source of truth: lib/hooks/resources/documents.ts
 */

export {
  useDocumentsByEntity as useDocuments,
  useDocumentsByProperty,
  useUploadDocument,
  useUploadDocumentsBulk,
  useDeleteDocument,
  documentKeys,
} from '@/lib/hooks/resources/documents';
