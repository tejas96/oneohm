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

import { ConfigService } from '../../../config/config.service';
import type { FileCategory, PresignedUploadUrlResponseDto, RequestUploadUrlDto } from '../dto';
import type { PresignedUrlResult } from '../interfaces';
import { S3StorageService } from './s3-storage.service';

/**
 * Allowed MIME types for upload
 */
const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  'site-visit': ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  document: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  profile: ['image/jpeg', 'image/png', 'image/webp'],
  quote: ['application/pdf', 'image/jpeg', 'image/png'],
  project: ['image/jpeg', 'image/png', 'application/pdf'],
  other: ['image/jpeg', 'image/png', 'application/pdf', 'application/octet-stream'],
};

/**
 * Max file sizes per category (in bytes)
 */
const MAX_FILE_SIZES: Record<FileCategory, number> = {
  'site-visit': 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  profile: 5 * 1024 * 1024, // 5MB
  quote: 10 * 1024 * 1024, // 10MB
  project: 20 * 1024 * 1024, // 20MB
  other: 10 * 1024 * 1024, // 10MB
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly s3Storage: S3StorageService,
    private readonly configService: ConfigService,
  ) {}

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
    return this.s3Storage.fileExists(fileKey);
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
    return /^[a-zA-Z0-9_\-\/\.]+$/.test(fileKey);
  }
}
