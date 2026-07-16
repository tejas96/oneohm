/**
 * Request Presigned URL DTOs
 *
 * DTOs for requesting presigned URLs for file upload/download
 *
 * @module modules/storage/dto
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory } from '@tejas96/shared/types';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export { FileCategory };

/**
 * Request DTO for getting a presigned upload URL
 */
export class RequestUploadUrlDto {
  @ApiProperty({
    description: 'Original filename',
    example: 'roof_photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(52428800) // 50MB max
  fileSize?: number;

  @ApiProperty({
    description: 'Category for file organization',
    enum: FileCategory,
    example: FileCategory.SITE,
  })
  @IsEnum(FileCategory)
  category!: FileCategory;

  @ApiPropertyOptional({
    description: 'Entity ID to associate the file with (e.g., propertyId, customerId)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Entity type for the association',
    example: 'site-visit-photo',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Sub-category for further organization',
    example: 'front_view',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  subCategory?: string;
}

/**
 * Response DTO for presigned upload URL
 */
export class PresignedUploadUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for uploading the file (PUT request)',
    example: 'https://fly.storage.tigris.dev/bucket/...',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Unique file key in storage',
    example: 'site-visit/550e8400.../abc123.jpg',
  })
  fileKey!: string;

  @ApiProperty({
    description: 'Public URL to access the file after upload',
    example: 'https://bucket.fly.storage.tigris.dev/site-visit/...',
  })
  publicUrl!: string;

  @ApiProperty({
    description: 'URL expiry timestamp',
    example: '2024-01-10T12:00:00Z',
  })
  expiresAt!: Date;
}

/**
 * Response DTO for presigned download URL
 */
export class PresignedDownloadUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for downloading the file',
    example: 'https://fly.storage.tigris.dev/bucket/...',
  })
  downloadUrl!: string;

  @ApiProperty({
    description: 'URL expiry timestamp',
    example: '2024-01-10T12:00:00Z',
  })
  expiresAt!: Date;
}

/**
 * Request DTO for deleting a file
 */
export class DeleteFileDto {
  @ApiProperty({
    description: 'File key in storage',
    example: 'site-visit/550e8400.../abc123.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileKey!: string;
}
