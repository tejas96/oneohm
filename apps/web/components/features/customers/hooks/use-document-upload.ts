'use client';

/**
 * Document Upload Hook
 *
 * Encapsulates the logic for validating, uploading, and saving property documents.
 * Handles S3 upload via presigned URL, progress tracking, and API persistence.
 *
 * @module features/customers/hooks/use-document-upload
 */

import { useCallback, useState } from 'react';

import { useAddPropertyDocument } from './use-property-documents';

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
  /** Current upload progress (0-100) */
  uploadProgress: number;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /**
   * Validate a file against accepted types and size limits.
   * Shows toast error if invalid.
   */
  validateFile: (file: File) => boolean;
  /**
   * Upload a file to S3 and save the document reference to the property.
   * Returns true on success, false on failure.
   */
  uploadDocument: (params: {
    propertyId: string;
    docType: string;
    file: File;
  }) => Promise<boolean>;
  /** Reset upload state (progress, isUploading) */
  resetUploadState: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useDocumentUpload(): UseDocumentUploadReturn {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const addDocumentMutation = useAddPropertyDocument();

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
        // Step 1: Upload file to S3
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

        // Step 2: Save document reference to property
        await addDocumentMutation.mutateAsync({
          propertyId,
          document: {
            url: uploadResult.publicUrl,
            tag: docType,
            fileName: uploadResult.fileName,
            fileSize: file.size,
            isLoanDoc: false,
            isVerified: false,
          },
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
    [addDocumentMutation, resetUploadState],
  );

  return {
    uploadProgress,
    isUploading,
    validateFile,
    uploadDocument,
    resetUploadState,
  };
}
