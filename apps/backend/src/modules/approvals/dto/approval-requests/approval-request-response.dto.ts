import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalRequestPriority, ApprovalRequestStatus } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';
import { ApprovalHistoryResponseDto } from '../approval-history/approval-history-response.dto';
import { ApprovalStageResponseDto } from '../approval-stages/approval-stage-response.dto';
import { ApprovalTemplateResponseDto } from '../approval-templates/approval-template-response.dto';

/**
 * Response DTO for approval request
 */
export class ApprovalRequestResponseDto {
  // ==================== Primary Key ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  // ==================== Foreign Keys ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  templateId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  currentStageId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  requestedBy!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  finalApprovedBy?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  finalRejectedBy?: string;

  // ==================== Reference Info ====================

  @ApiProperty({ example: 'purchase_order' })
  @Expose()
  referenceType!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  referenceId!: string;

  // ==================== Request Info ====================

  @ApiProperty({ example: 'APR-2024-001' })
  @Expose()
  requestNumber!: string;

  @ApiProperty({ example: 'Purchase Order Approval - PO-2024-001' })
  @Expose()
  title!: string;

  @ApiPropertyOptional({ example: 'Approval needed for IT equipment purchase' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: 85000.5 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  amount?: number;

  // ==================== Current Stage Info ====================

  @ApiProperty({ example: 1 })
  @Expose()
  currentStageOrder!: number;

  // ==================== Status ====================

  @ApiProperty({ enum: ApprovalRequestStatus, example: ApprovalRequestStatus.IN_PROGRESS })
  @Expose()
  status!: ApprovalRequestStatus;

  @ApiProperty({ enum: ApprovalRequestPriority, example: ApprovalRequestPriority.NORMAL })
  @Expose()
  priority!: ApprovalRequestPriority;

  // ==================== Timestamps ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  submittedAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  completedAt?: Date;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  expiresAt?: Date;

  // ==================== Final Result ====================

  @ApiPropertyOptional({ enum: ApprovalRequestStatus, example: ApprovalRequestStatus.APPROVED })
  @Expose()
  finalStatus?: ApprovalRequestStatus;

  @ApiPropertyOptional({ example: 'Approved by all required approvers' })
  @Expose()
  finalComment?: string;

  // ==================== Metadata ====================

  @ApiPropertyOptional({ example: { department: 'IT', projectCode: 'PROJ-123' } })
  @Expose()
  metadata?: Record<string, unknown>;

  // ==================== Relations ====================

  @ApiPropertyOptional({ type: ApprovalTemplateResponseDto })
  @Expose()
  @Type(() => ApprovalTemplateResponseDto)
  template?: ApprovalTemplateResponseDto;

  @ApiPropertyOptional({ type: ApprovalStageResponseDto })
  @Expose()
  @Type(() => ApprovalStageResponseDto)
  currentStage?: ApprovalStageResponseDto;

  @ApiPropertyOptional({ type: [ApprovalHistoryResponseDto] })
  @Expose()
  @Type(() => ApprovalHistoryResponseDto)
  history?: ApprovalHistoryResponseDto[];

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  updatedBy?: string;
}
