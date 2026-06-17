// ============================================
// IMPORTS
// ============================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentEntityType } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

/**
 * Attachment Response DTO
 */
export class CommentAttachmentResponseDto {
  @ApiProperty()
  @Expose()
  fileName!: string;

  @ApiProperty()
  @Expose()
  fileUrl!: string;

  @ApiPropertyOptional()
  @Expose()
  fileSize?: number;

  @ApiPropertyOptional()
  @Expose()
  mimeType?: string;
}

/**
 * User Response DTO (Minimal)
 */
export class CommentUserResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  firstName!: string;

  @ApiProperty()
  @Expose()
  lastName!: string;

  @ApiProperty()
  @Expose()
  email!: string;

  @ApiPropertyOptional()
  @Expose()
  avatarUrl?: string;
}

/**
 * Comment Response DTO
 */
export class CommentResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  @ApiProperty({ enum: CommentEntityType })
  @Expose()
  entityType!: CommentEntityType;

  @ApiProperty()
  @Expose()
  entityId!: string;

  @ApiProperty()
  @Expose()
  commentText!: string;

  @ApiPropertyOptional()
  @Expose()
  parentCommentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  mentionedUserIds?: string[];

  @ApiPropertyOptional({ type: [CommentAttachmentResponseDto] })
  @Expose()
  @Type(() => CommentAttachmentResponseDto)
  attachments?: CommentAttachmentResponseDto[];

  @ApiProperty()
  @Expose()
  isInternal!: boolean;

  @ApiProperty()
  @Expose()
  isEdited!: boolean;

  @ApiPropertyOptional()
  @Expose()
  editedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  deletedAt?: Date;

  // ============================================
  // RELATIONS
  // ============================================
  @ApiPropertyOptional({ type: CommentUserResponseDto })
  @Expose()
  @Type(() => CommentUserResponseDto)
  createdByUser?: CommentUserResponseDto;

  @ApiPropertyOptional({ type: () => CommentResponseDto })
  @Expose()
  @Type(() => CommentResponseDto)
  parentComment?: CommentResponseDto;
}
