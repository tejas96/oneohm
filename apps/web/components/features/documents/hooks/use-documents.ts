'use client';

/**
 * Document feature hooks — re-exports from FDAL resource layer.
 * Single source of truth: lib/hooks/resources/documents.ts
 */

export {
  useDocumentsByEntity as useDocuments,
  useDocumentsByProperty,
  useDocumentsByEntityBatch,
  useUploadDocument,
  useUploadDocumentsBulk,
  useUpdateDocument,
  useDeleteDocument,
} from '@/lib/hooks/resources/documents';
