/**
 * S3 Storage Service
 *
 * Implements storage operations using AWS S3 SDK.
 * Compatible with Tigris, MinIO, and other S3-compatible services.
 *
 * @module modules/storage/services
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '../../../config/config.service';
import type {
  FileMetadata,
  PresignedDownloadOptions,
  PresignedUploadOptions,
  PresignedUrlResult,
  StorageProvider,
} from '../interfaces';

@Injectable()
export class S3StorageService implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client!: S3Client;
  private bucket!: string;
  private publicUrlBase!: string;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize S3 client on module init
   */
  onModuleInit(): void {
    const storageConfig = this.configService.storage;

    if (!storageConfig.awsAccessKeyId || !storageConfig.awsSecretAccessKey) {
      this.logger.warn('S3 credentials not configured. Storage operations will fail.');
      return;
    }

    if (!storageConfig.awsS3Bucket) {
      this.logger.warn('S3 bucket not configured. Storage operations will fail.');
      return;
    }

    this.bucket = storageConfig.awsS3Bucket;

    // Configure S3 client
    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: storageConfig.awsRegion || 'auto',
      credentials: {
        accessKeyId: storageConfig.awsAccessKeyId,
        secretAccessKey: storageConfig.awsSecretAccessKey,
      },
    };

    // Custom endpoint for Tigris or other S3-compatible services
    if (storageConfig.s3Endpoint) {
      clientConfig.endpoint = storageConfig.s3Endpoint;
      clientConfig.forcePathStyle = false; // Tigris uses virtual-hosted style
    }

    this.s3Client = new S3Client(clientConfig);

    // Set public URL base
    if (storageConfig.s3Endpoint) {
      // For Tigris: https://{bucket}.fly.storage.tigris.dev
      this.publicUrlBase = `https://${this.bucket}.fly.storage.tigris.dev`;
    } else {
      // For AWS S3: https://{bucket}.s3.{region}.amazonaws.com
      this.publicUrlBase = `https://${this.bucket}.s3.${storageConfig.awsRegion}.amazonaws.com`;
    }

    this.logger.log(`S3 Storage initialized with bucket: ${this.bucket}`);
  }

  /**
   * Generate a presigned URL for uploading a file
   */
  async getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUrlResult> {
    const { fileKey, contentType, contentLength, expiresIn, metadata } = options;
    const expiry = expiresIn || this.configService.storage.presignedUrlExpiry || 3600;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: contentLength,
      Metadata: metadata,
      // Make object publicly readable after upload
      ACL: 'public-read',
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: expiry });

    return {
      url,
      fileKey,
      publicUrl: `${this.publicUrlBase}/${fileKey}`,
      expiresAt: new Date(Date.now() + expiry * 1000),
    };
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  async getPresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedUrlResult> {
    const { fileKey, expiresIn, downloadFilename } = options;
    const expiry = expiresIn || this.configService.storage.presignedUrlExpiry || 3600;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ResponseContentDisposition: downloadFilename
        ? `attachment; filename="${downloadFilename}"`
        : undefined,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: expiry });

    return {
      url,
      fileKey,
      expiresAt: new Date(Date.now() + expiry * 1000),
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    await this.s3Client.send(command);
    this.logger.debug(`Deleted file: ${fileKey}`);
  }

  /**
   * Check if a file exists
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileKey: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);

      return {
        filename: fileKey.split('/').pop() || fileKey,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
        metadata: response.Metadata,
        uploadedAt: response.LastModified,
      };
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Directly upload a buffer to S3 (server-side upload, no presigned URL needed)
   */
  async uploadBuffer(
    fileKey: string,
    body: Buffer,
    contentType: string,
    acl: 'public-read' | 'private' = 'public-read',
  ): Promise<{ fileKey: string; publicUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
      ACL: acl,
    });

    await this.s3Client.send(command);
    this.logger.debug(`Uploaded buffer to: ${fileKey} (${body.length} bytes)`);

    return {
      fileKey,
      publicUrl: `${this.publicUrlBase}/${fileKey}`,
    };
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey,
    });

    await this.s3Client.send(command);
    this.logger.debug(`Copied file from ${sourceKey} to ${destinationKey}`);
  }
}
