import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalDecision } from '@tejas96/shared/types';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for approval action (approve/reject)
 */
export class ApprovalActionDto {
  // ==================== Decision ====================

  @ApiProperty({
    description: 'Approval decision',
    enum: Object.values(ApprovalDecision),
    enumName: 'ApprovalDecision',
    example: ApprovalDecision.APPROVED,
  })
  @IsEnum(ApprovalDecision)
  @IsNotEmpty()
  decision!: ApprovalDecision;

  // ==================== Comment ====================

  @ApiPropertyOptional({
    description: 'Comment/notes for the decision',
    example: 'Approved. Budget is within limits.',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
