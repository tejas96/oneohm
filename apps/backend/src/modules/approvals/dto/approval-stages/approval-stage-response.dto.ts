import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalRequirementType,
  ApproverType,
  AutoActionOnTimeout,
} from '@tejas96/shared/types';
import { Expose } from 'class-transformer';

/**
 * Response DTO for approval stage
 */
export class ApprovalStageResponseDto {
  // ==================== Primary Key ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  // ==================== Foreign Keys ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  templateId!: string;

  // ==================== Stage Info ====================

  @ApiProperty({ example: 'Manager Approval' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: 'Approval by department manager' })
  @Expose()
  description?: string;

  @ApiProperty({ example: 1 })
  @Expose()
  stageOrder!: number;

  // ==================== Approver Configuration ====================

  @ApiProperty({ enum: ApproverType, example: ApproverType.ROLE_BASED })
  @Expose()
  approverType!: ApproverType;

  @Expose()
  approverRoles?: string[];

  @ApiPropertyOptional({ type: [String], example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @Expose()
  approverUserIds?: string[];

  @ApiPropertyOptional({ example: { field: 'createdBy.managerId' } })
  @Expose()
  dynamicApproverRules?: Record<string, unknown>;

  // ==================== Approval Requirements ====================

  @ApiProperty({ enum: ApprovalRequirementType, example: ApprovalRequirementType.ANY })
  @Expose()
  approvalRequirementType!: ApprovalRequirementType;

  @ApiProperty({ example: 1 })
  @Expose()
  requiredApprovalsCount!: number;

  // ==================== Stage Behavior ====================

  @ApiProperty({ example: true })
  @Expose()
  isMandatory!: boolean;

  @ApiProperty({ example: false })
  @Expose()
  canSkip!: boolean;

  @ApiPropertyOptional({ example: { amount: { lessThan: 5000 } } })
  @Expose()
  skipConditions?: Record<string, unknown>;

  @ApiProperty({ example: false })
  @Expose()
  allowParallelApproval!: boolean;

  // ==================== Timeout ====================

  @ApiPropertyOptional({ example: 24 })
  @Expose()
  timeoutHours?: number;

  @ApiPropertyOptional({ enum: AutoActionOnTimeout, example: AutoActionOnTimeout.ESCALATE })
  @Expose()
  autoActionOnTimeout?: AutoActionOnTimeout;

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
