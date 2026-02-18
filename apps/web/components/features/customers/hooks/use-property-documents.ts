'use client';

/**
 * Property Document Management Hooks
 *
 * Hooks for adding, removing, and downloading property documents.
 * Documents are stored as JSONB on CustomerPropertyEntity.
 *
 * @module features/customers/hooks/use-property-documents
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { propertyKeys } from './use-customer-properties';

import { apiClient } from '@/lib/api/client';
import { getDownloadUrl } from '@/lib/api/storage';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

interface AddDocumentParams {
  propertyId: string;
  document: {
    url: string;
    tag: string;
    fileName: string;
    isLoanDoc?: boolean;
    isVerified?: boolean;
    fileSize?: number;
    uploadedAt?: string;
  };
}

interface RemoveDocumentParams {
  propertyId: string;
  documentUrl: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to add a document to a property
 * Calls POST /customer-properties/:id/documents
 */
export function useAddPropertyDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ propertyId, document }: AddDocumentParams) => {
      const docWithTimestamp = {
        ...document,
        uploadedAt: document.uploadedAt || new Date().toISOString(),
      };
      return apiClient.post(
        `/customer-properties/${propertyId}/documents`,
        docWithTimestamp,
        { headers: { 'X-Organization-Id': organizationId } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

/**
 * Hook to remove a document from a property
 * Calls DELETE /customer-properties/:id/documents/:encodedUrl
 */
export function useRemovePropertyDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ propertyId, documentUrl }: RemoveDocumentParams) => {
      const encodedUrl = btoa(documentUrl);
      return apiClient.delete(
        `/customer-properties/${propertyId}/documents/${encodedUrl}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

/**
 * Hook to get a presigned download URL for a document.
 * Pass fileName to get a URL with Content-Disposition: attachment (forces download).
 * Omit fileName to get a URL suitable for inline viewing/preview.
 */
export function useDocumentDownloadUrl() {
  return useMutation({
    mutationFn: async ({
      documentUrl,
      fileName,
    }: {
      documentUrl: string;
      fileName?: string;
    }) => {
      const fileKey = documentUrl.includes('://')
        ? new URL(documentUrl).pathname.slice(1)
        : documentUrl;
      return getDownloadUrl(fileKey, fileName);
    },
  });
}
