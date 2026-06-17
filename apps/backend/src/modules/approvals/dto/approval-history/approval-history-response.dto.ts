import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalAction, ApprovalDecision } from '@tejas96/shared/types';
import { Expose } from 'class-transformer';

/**
 * Response DTO for approval history
 */
export class ApprovalHistoryResponseDto {
  // ==================== Primary Key ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  // ==================== Foreign Keys ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  approvalRequestId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  stageId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  actedBy!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  delegatedFrom?: string;

  // ==================== Action Info ====================

  @ApiProperty({ enum: ApprovalAction, example: ApprovalAction.APPROVED })
  @Expose()
  action!: ApprovalAction;

  @ApiPropertyOptional({ enum: ApprovalDecision, example: ApprovalDecision.APPROVED })
  @Expose()
  decision?: ApprovalDecision;

  @ApiPropertyOptional({ example: 'Approved. Budget is within limits.' })
  @Expose()
  comment?: string;

  // ==================== Actor Info ====================

  @Expose()
  actedByRole?: string;

  // ==================== Timestamps ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  actedAt!: Date;

  // ==================== Metadata ====================

  @ApiPropertyOptional({ example: { ipAddress: '192.168.1.1', userAgent: 'Mozilla...' } })
  @Expose()
  metadata?: Record<string, unknown>;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  createdAt!: Date;
}
