import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalWorkflowType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateApprovalStageDto } from '../approval-stages/create-approval-stage.dto';

/**
 * DTO for creating a new approval template
 */
export class CreateApprovalTemplateDto {
  // ==================== Organization ====================

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  // ==================== Template Info ====================

  @ApiProperty({
    description: 'Template name',
    example: 'PO Approval - Under 100K',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Unique template code',
    example: 'PO_UNDER_100K',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Approval workflow for purchase orders under 100,000',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Workflow type',
    enum: Object.values(ApprovalWorkflowType),
    enumName: 'ApprovalWorkflowType',
    example: ApprovalWorkflowType.PURCHASE_ORDER,
  })
  @IsEnum(ApprovalWorkflowType)
  @IsNotEmpty()
  workflowType!: ApprovalWorkflowType;

  // ==================== Trigger Conditions ====================

  @ApiPropertyOptional({
    description: 'Trigger conditions (JSONB)',
    example: { minAmount: 50000, maxAmount: 100000 },
  })
  @IsObject()
  @IsOptional()
  triggerConditions?: Record<string, unknown>;

  // ==================== Auto-approval ====================

  @ApiPropertyOptional({
    description: 'Enable auto-approval',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoApprovalEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Auto-approval conditions (JSONB)',
    example: { amount: { lessThan: 10000 } },
  })
  @IsObject()
  @IsOptional()
  autoApprovalConditions?: Record<string, unknown>;

  // ==================== Escalation ====================

  @ApiPropertyOptional({
    description: 'Enable escalation on timeout',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  escalationEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Escalation timeout in hours',
    example: 48,
    minimum: 1,
    maximum: 720,
  })
  @IsInt()
  @Min(1)
  @Max(720)
  @IsOptional()
  @Type(() => Number)
  escalationHours?: number;

  // ==================== Notifications ====================

  @ApiPropertyOptional({
    description: 'Send notification on request creation',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnRequest?: boolean;

  @ApiPropertyOptional({
    description: 'Send notification on approval',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Send notification on rejection',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnRejection?: boolean;

  // ==================== Status ====================

  @ApiPropertyOptional({
    description: 'Is template active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // ==================== Stages ====================

  @ApiProperty({
    description: 'Approval stages',
    type: [CreateApprovalStageDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalStageDto)
  @IsNotEmpty()
  stages!: CreateApprovalStageDto[];
}
