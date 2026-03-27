'use client';

import type { DocumentCategory, DocumentEntityType } from '@oneohm-epc/shared/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { createResourceKeys, useOrgContext } from '../core';

import {
  getDocuments,
  createDocument,
  createDocumentsBulk,
  deleteDocument,
  updateDocument,
  type CreateDocumentPayload,
  type DocumentRecord,
} from '@/lib/api/documents';

// ── Query Keys (FDAL-compliant with orgId) ─────────────────────

const documentKeys = createResourceKeys('documents');

// ── Query Hooks ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDocumentsByEntity(entityType: DocumentEntityType, entityId: string | undefined) {
  const { organizationId, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...documentKeys.all(organizationId), entityType, entityId ?? ''],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ entityType, entityId: entityId!, organizationId }),
    enabled: !!entityId && isReady,
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDocumentsByProperty(propertyId: string | undefined) {
  const { organizationId, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...documentKeys.all(organizationId), 'property', propertyId ?? ''],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ propertyId: propertyId!, organizationId }),
    enabled: !!propertyId && isReady,
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDocumentsByEntityBatch(entityType: DocumentEntityType, entityIds: string[]) {
  const { organizationId, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...documentKeys.all(organizationId), entityType, 'batch', ...entityIds],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ entityType, entityIds: entityIds.join(','), organizationId }),
    enabled: entityIds.length > 0 && isReady,
  });
}

// ── Mutation Hooks ─────────────────────────────────────────────

export function useUploadDocument(): UseMutationResult<
  DocumentRecord,
  unknown,
  CreateDocumentPayload
> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload): Promise<DocumentRecord> =>
      createDocument(payload, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}

export function useUploadDocumentsBulk(): UseMutationResult<
  DocumentRecord[],
  unknown,
  CreateDocumentPayload[]
> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (documents: CreateDocumentPayload[]): Promise<DocumentRecord[]> =>
      createDocumentsBulk(documents, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}

interface UpdateDocumentPayload {
  id: string;
  tag?: string;
  notes?: string;
  category?: DocumentCategory;
  metadata?: Record<string, unknown>;
}

export function useUpdateDocument(): UseMutationResult<
  DocumentRecord,
  unknown,
  UpdateDocumentPayload
> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateDocumentPayload): Promise<DocumentRecord> =>
      updateDocument(id, payload, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}

export function useDeleteDocument(): UseMutationResult<void, unknown, string> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (id: string): Promise<void> => deleteDocument(id, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}
