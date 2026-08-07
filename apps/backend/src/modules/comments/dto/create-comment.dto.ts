// ============================================
// IMPORTS
// ============================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentEntityType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Attachment DTO
 */
export class CommentAttachmentDto {
  @ApiProperty({ description: 'File name', example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'File URL',
    example: 'https://storage.example.com/documents/123.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 102400 })
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

/**
 * Create Comment DTO
 */
export class CreateCommentDto {

  @ApiProperty({
    description: 'Entity type',
    enum: CommentEntityType,
    example: CommentEntityType.PROJECT,
  })
  @IsEnum(CommentEntityType)
  @IsNotEmpty()
  entityType!: CommentEntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsUUID()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty({ description: 'Comment text', example: 'This is a comment' })
  @IsString()
  @IsNotEmpty()
  commentText!: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @ApiPropertyOptional({
    description: 'User IDs to mention',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  mentionedUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Attachments',
    type: [CommentAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommentAttachmentDto)
  attachments?: CommentAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Is internal comment (not visible to customers)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
