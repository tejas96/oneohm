// ============================================
// IMPORTS
// ============================================
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateCommentDto } from './create-comment.dto';

/**
 * Update Comment DTO
 * Allows updating comment text, attachments, mentions, and visibility
 */
export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @ApiPropertyOptional({ description: 'Mark comment as edited' })
  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;
}
