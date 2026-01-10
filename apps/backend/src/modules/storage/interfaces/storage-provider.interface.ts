/**
 * Storage Provider Interface
 *
 * Defines the contract for storage providers (S3, Tigris, Azure, GCP, etc.)
 *
 * @module modules/storage/interfaces
 */

/**
 * Options for generating a presigned upload URL
 */
export interface PresignedUploadOptions {
  /** Unique file key/path in the bucket */
  fileKey: string;
  /** MIME type of the file */
  contentType: string;
  /** File size in bytes (for validation) */
  contentLength?: number;
  /** URL expiry in seconds */
  expiresIn?: number;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
}

/**
 * Options for generating a presigned download URL
 */
export interface PresignedDownloadOptions {
  /** File key/path in the bucket */
  fileKey: string;
  /** URL expiry in seconds */
  expiresIn?: number;
  /** Custom filename for download */
  downloadFilename?: string;
}

/**
 * Result of presigned URL generation
 */
export interface PresignedUrlResult {
  /** The presigned URL for upload/download */
  url: string;
  /** The file key in the bucket */
  fileKey: string;
  /** Public URL to access the file after upload (if public) */
  publicUrl?: string;
  /** Expiry timestamp */
  expiresAt: Date;
}

/**
 * File metadata stored with the file
 */
export interface FileMetadata {
  /** Original filename */
  filename: string;
  /** MIME type */
  contentType: string;
  /** File size in bytes */
  contentLength: number;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Upload timestamp */
  uploadedAt?: Date;
}

/**
 * Storage Provider Interface
 *
 * All storage implementations must follow this contract
 */
export interface StorageProvider {
  /**
   * Generate a presigned URL for uploading a file
   */
  getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUrlResult>;

  /**
   * Generate a presigned URL for downloading a file
   */
  getPresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedUrlResult>;

  /**
   * Delete a file from storage
   */
  deleteFile(fileKey: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(fileKey: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getFileMetadata(fileKey: string): Promise<FileMetadata | null>;

  /**
   * Copy a file to a new location
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<void>;
}
