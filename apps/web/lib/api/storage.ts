/**
 * Storage API Service
 *
 * Handles file uploads to cloud storage using presigned URLs.
 * Follows the same pattern as mobile app.
 *
 * @module lib/api/storage
 */

import { FileCategory } from '@oneohm-epc/shared/types';

import { apiClient } from './client';

export { FileCategory };

export interface RequestUploadUrlDto {
  fileName: string;
  contentType: string;
  fileSize?: number;
  category: FileCategory;
  entityId?: string;
  entityType?: string;
  subCategory?: string;
}

export interface PresignedUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadOptions {
  file: File;
  category: FileCategory;
  entityId?: string;
  entityType?: string;
  subCategory?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadResult {
  fileKey: string;
  publicUrl: string;
  fileName: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get a presigned URL for uploading a file
 */
export async function getPresignedUrl(
  dto: RequestUploadUrlDto,
): Promise<PresignedUploadUrlResponse> {
  const { data } = await apiClient.post<PresignedUploadUrlResponse>('/storage/presigned-url', dto);
  return data;
}

/**
 * Upload file directly to storage using presigned URL
 */
async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    // Open connection and send
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Upload a file to storage with retry logic
 */
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function uploadWithRetry(options: UploadOptions, retryCount = 0): Promise<UploadResult> {
  const { file, category, entityId, entityType, subCategory, onProgress } = options;

  try {
    // 1. Get presigned URL from backend
    const presignedResponse = await getPresignedUrl({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category,
      entityId,
      entityType,
      subCategory,
    });

    // 2. Upload directly to storage using presigned URL
    await uploadToPresignedUrl(presignedResponse.uploadUrl, file, onProgress);

    // 3. Return result
    return {
      fileKey: presignedResponse.fileKey,
      publicUrl: presignedResponse.publicUrl,
      fileName: file.name,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (retryCount < MAX_RETRIES) {
      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return uploadWithRetry(options, retryCount + 1);
    }

    throw new Error(`Upload failed after ${MAX_RETRIES + 1} attempts: ${errorMessage}`);
  }
}

/**
 * Upload a file to storage
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  return uploadWithRetry(options);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(fileKey: string): Promise<void> {
  await apiClient.delete('/storage/files', { data: { fileKey } });
}

// ============================================================================
// Download Functions
// ============================================================================

export interface PresignedDownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
}

/**
 * Get a presigned URL for downloading a file
 * @param fileKey The storage key of the file
 * @param downloadFilename Optional custom filename for download
 */
export async function getDownloadUrl(fileKey: string, downloadFilename?: string): Promise<string> {
  const params = new URLSearchParams();
  if (downloadFilename) {
    params.set('filename', downloadFilename);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const { data } = await apiClient.get<PresignedDownloadUrlResponse>(
    `/storage/download-url/${encodeURIComponent(fileKey)}${query}`,
  );
  return data.downloadUrl;
}
