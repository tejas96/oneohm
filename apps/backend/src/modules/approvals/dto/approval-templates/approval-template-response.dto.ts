import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalWorkflowType } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

import { ApprovalStageResponseDto } from '../approval-stages/approval-stage-response.dto';

/**
 * Response DTO for approval template
 */
export class ApprovalTemplateResponseDto {
  // ==================== Primary Key ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  // ==================== Organization ====================


  // ==================== Template Info ====================

  @ApiProperty({ example: 'PO Approval - Under 100K' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'PO_UNDER_100K' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'Approval workflow for purchase orders under 100,000' })
  @Expose()
  description?: string;

  @ApiProperty({ enum: ApprovalWorkflowType, example: ApprovalWorkflowType.PURCHASE_ORDER })
  @Expose()
  workflowType!: ApprovalWorkflowType;

  // ==================== Trigger Conditions ====================

  @ApiPropertyOptional({ example: { minAmount: 50000, maxAmount: 100000 } })
  @Expose()
  triggerConditions?: Record<string, unknown>;

  // ==================== Auto-approval ====================

  @ApiProperty({ example: false })
  @Expose()
  autoApprovalEnabled!: boolean;

  @ApiPropertyOptional({ example: { amount: { lessThan: 10000 } } })
  @Expose()
  autoApprovalConditions?: Record<string, unknown>;

  // ==================== Escalation ====================

  @ApiProperty({ example: false })
  @Expose()
  escalationEnabled!: boolean;

  @ApiPropertyOptional({ example: 48 })
  @Expose()
  escalationHours?: number;

  // ==================== Notifications ====================

  @ApiProperty({ example: true })
  @Expose()
  notifyOnRequest!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  notifyOnApproval!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  notifyOnRejection!: boolean;

  // ==================== Status ====================

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  // ==================== Stages ====================

  @ApiPropertyOptional({ type: [ApprovalStageResponseDto] })
  @Expose()
  @Type(() => ApprovalStageResponseDto)
  stages?: ApprovalStageResponseDto[];

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

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  deletedAt?: Date;
}
