'use client';

/**
 * Document Upload Hook
 *
 * Encapsulates the logic for validating, uploading, and saving documents
 * using the new generic documents API (entityType + entityId pattern).
 *
 * @module features/customers/hooks/use-document-upload
 */

import { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';
import { useCallback, useState } from 'react';

import { useUploadDocument } from '@/components/features/documents/hooks';
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '@/components/shared/document-collector/constants';
import { showToast } from '@/components/ui';
import { FileCategory, uploadFile } from '@/lib/api/storage';

// ============================================================================
// Types
// ============================================================================

interface UseDocumentUploadReturn {
  uploadProgress: number;
  isUploading: boolean;
  validateFile: (file: File) => boolean;
  uploadDocument: (params: { propertyId: string; docType: string; file: File }) => Promise<boolean>;
  resetUploadState: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useDocumentUpload(): UseDocumentUploadReturn {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useUploadDocument();

  const resetUploadState = useCallback(() => {
    setUploadProgress(0);
    setIsUploading(false);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    if (!ACCEPTED_FILE_TYPES.all.includes(file.type)) {
      showToast.error('Please upload an image (JPEG, PNG) or PDF file');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast.error('File size must be less than 5MB');
      return false;
    }
    return true;
  }, []);

  const uploadDocument = useCallback(
    async ({
      propertyId,
      docType,
      file,
    }: {
      propertyId: string;
      docType: string;
      file: File;
    }): Promise<boolean> => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const uploadResult = await uploadFile({
          file,
          category: FileCategory.DOCUMENT,
          entityId: propertyId,
          entityType: 'customer-property',
          subCategory: docType,
          onProgress: (progress) => {
            setUploadProgress(progress.percent);
          },
        });

        const category = file.type.startsWith('image/')
          ? DocumentCategory.IMAGE
          : DocumentCategory.DOCUMENT;

        await uploadMutation.mutateAsync({
          entityType: DocumentEntityType.PROPERTY,
          entityId: propertyId,
          category,
          tag: docType,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.publicUrl,
          fileSizeBytes: file.size,
          mimeType: file.type,
        });

        showToast.success('Document uploaded successfully');
        resetUploadState();
        return true;
      } catch {
        showToast.error('Failed to upload document. Please try again.');
        setIsUploading(false);
        return false;
      }
    },
    [uploadMutation, resetUploadState],
  );

  return {
    uploadProgress,
    isUploading,
    validateFile,
    uploadDocument,
    resetUploadState,
  };
}
