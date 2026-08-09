/**
 * Storage Service
 *
 * Facade service for storage operations.
 * Handles file key generation, validation, and delegates to the appropriate provider.
 *
 * @module modules/storage/services
 */

import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileCategory } from '@tejas96/shared/types';

import { ConfigService } from '../../../config/config.service';
import type { PresignedUploadUrlResponseDto, RequestUploadUrlDto } from '../dto';
import type { PresignedUrlResult } from '../interfaces';
import { S3StorageService } from './s3-storage.service';

/**
 * Allowed MIME types for upload
 */
const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  [FileCategory.SITE]: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  [FileCategory.DOCUMENT]: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  [FileCategory.PROFILE]: ['image/jpeg', 'image/png', 'image/webp'],
  [FileCategory.QUOTE]: ['application/pdf', 'image/jpeg', 'image/png'],
  [FileCategory.PROJECT]: ['image/jpeg', 'image/png', 'application/pdf'],
  [FileCategory.SERVICE]: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  [FileCategory.OTHER]: ['image/jpeg', 'image/png', 'application/pdf', 'application/octet-stream'],
};

/**
 * Max file sizes per category (in bytes)
 */
const MAX_FILE_SIZES: Record<FileCategory, number> = {
  [FileCategory.SITE]: 10 * 1024 * 1024, // 10MB
  [FileCategory.DOCUMENT]: 20 * 1024 * 1024, // 20MB
  [FileCategory.PROFILE]: 5 * 1024 * 1024, // 5MB
  [FileCategory.QUOTE]: 10 * 1024 * 1024, // 10MB
  [FileCategory.PROJECT]: 20 * 1024 * 1024, // 20MB
  [FileCategory.SERVICE]: 10 * 1024 * 1024, // 10MB — issue photos from a phone camera
  [FileCategory.OTHER]: 10 * 1024 * 1024, // 10MB
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly s3Storage: S3StorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Upload a buffer directly to storage (server-side upload).
   */
  async uploadBuffer(options: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    category: FileCategory;
    entityId?: string;
    entityType?: string;
    propertyId?: string;
    subCategory?: string;
  }): Promise<{ fileKey: string; publicUrl: string; fileName: string }> {
    const allowedTypes = ALLOWED_MIME_TYPES[options.category];
    if (!allowedTypes.includes(options.contentType)) {
      throw new BadRequestException(
        `Invalid file type '${options.contentType}' for category '${options.category}'. ` +
          `Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const maxSize = MAX_FILE_SIZES[options.category];
    if (options.buffer.length > maxSize) {
      throw new BadRequestException(
        `File size ${options.buffer.length} bytes exceeds maximum ${maxSize} bytes for category '${options.category}'`,
      );
    }

    const fileKey = this.generateFileKey({
      category: options.category,
      fileName: options.fileName,
      contentType: options.contentType,
      entityId: options.entityId,
      entityType: options.entityType,
      subCategory: options.subCategory,
    });

    const result = await this.s3Storage.uploadBuffer({
      fileKey,
      buffer: options.buffer,
      contentType: options.contentType,
      metadata: {
        originalFilename: options.fileName,
        category: options.category,
        entityId: options.entityId || '',
        entityType: options.entityType || '',
        propertyId: options.propertyId || '',
        subCategory: options.subCategory || '',
      },
    });

    return {
      fileKey: result.fileKey,
      publicUrl: result.publicUrl!,
      fileName: options.fileName,
    };
  }

  /**
   * Generate a presigned URL for uploading a file
   */
  async getUploadUrl(dto: RequestUploadUrlDto): Promise<PresignedUploadUrlResponseDto> {
    // Validate MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[dto.category];
    if (!allowedTypes.includes(dto.contentType)) {
      throw new BadRequestException(
        `Invalid file type '${dto.contentType}' for category '${dto.category}'. ` +
          `Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[dto.category];
    if (dto.fileSize && dto.fileSize > maxSize) {
      throw new BadRequestException(
        `File size ${dto.fileSize} bytes exceeds maximum ${maxSize} bytes for category '${dto.category}'`,
      );
    }

    // Generate unique file key
    const fileKey = this.generateFileKey(dto);

    // Get presigned URL from storage provider
    const result = await this.s3Storage.getPresignedUploadUrl({
      fileKey,
      contentType: dto.contentType,
      contentLength: dto.fileSize,
      metadata: {
        originalFilename: dto.fileName,
        category: dto.category,
        entityId: dto.entityId || '',
        entityType: dto.entityType || '',
        subCategory: dto.subCategory || '',
      },
    });

    return {
      uploadUrl: result.url,
      fileKey: result.fileKey,
      publicUrl: result.publicUrl!,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  async getDownloadUrl(fileKey: string, downloadFilename?: string): Promise<PresignedUrlResult> {
    if (!this.isValidFileKey(fileKey)) {
      throw new BadRequestException('Invalid file key format');
    }

    return this.s3Storage.getPresignedDownloadUrl({
      fileKey,
      downloadFilename,
    });
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    // Validate file key format to prevent path traversal
    if (!this.isValidFileKey(fileKey)) {
      throw new BadRequestException('Invalid file key format');
    }

    await this.s3Storage.deleteFile(fileKey);
    this.logger.log(`File deleted: ${fileKey}`);
  }

  /**
   * Check if a file exists
   */
  async fileExists(fileKey: string): Promise<boolean> {
    if (!this.isValidFileKey(fileKey)) {
      throw new BadRequestException('Invalid file key format');
    }

    return this.s3Storage.fileExists(fileKey);
  }

  /**
   * Extract S3 file key from a public URL.
   * Returns null (with a warning log) if the URL is unparseable or the key is invalid.
   */
  extractFileKeyFromUrl(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);
      const key = url.pathname.slice(1);
      if (!key) {
        this.logger.warn(`Empty file key extracted from URL: ${publicUrl}`);
        return null;
      }
      if (!this.isValidFileKey(key)) {
        this.logger.warn(`Invalid file key extracted from URL: ${publicUrl} -> ${key}`);
        return null;
      }
      return key;
    } catch {
      this.logger.warn(`Failed to parse URL for file key extraction: ${publicUrl}`);
      return null;
    }
  }

  /**
   * Generate a unique file key based on category and entity
   */
  private generateFileKey(dto: RequestUploadUrlDto): string {
    const uuid = randomUUID();
    const timestamp = Date.now();
    const extension = this.getFileExtension(dto.fileName);
    const sanitizedFilename = this.sanitizeFilename(dto.fileName);

    // Build path segments
    const segments: string[] = [dto.category];

    if (dto.entityId) {
      segments.push(dto.entityId);
    }

    if (dto.subCategory) {
      segments.push(dto.subCategory);
    }

    // Format: category/entityId/subCategory/timestamp_uuid_filename.ext
    segments.push(`${timestamp}_${uuid.slice(0, 8)}_${sanitizedFilename}${extension}`);

    return segments.join('/');
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.slice(lastDot).toLowerCase();
  }

  /**
   * Sanitize filename for storage
   */
  private sanitizeFilename(filename: string): string {
    // Remove extension
    const lastDot = filename.lastIndexOf('.');
    const nameWithoutExt = lastDot !== -1 ? filename.slice(0, lastDot) : filename;

    // Replace non-alphanumeric characters with underscore
    return nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50); // Limit length
  }

  /**
   * Validate file key format
   */
  private isValidFileKey(fileKey: string): boolean {
    // Must not contain path traversal attempts
    if (fileKey.includes('..') || fileKey.startsWith('/')) {
      return false;
    }

    // Must be a reasonable length
    if (fileKey.length < 5 || fileKey.length > 500) {
      return false;
    }

    // Must only contain allowed characters
    return /^[a-zA-Z0-9_\-/.]+$/.test(fileKey);
  }
}
