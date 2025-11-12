import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@oneohm-epc/shared-auth';
import {
  ApprovalRequirementType,
  ApproverType,
  AutoActionOnTimeout,
} from '@oneohm-epc/shared-types';
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
} from 'class-validator';

/**
 * DTO for creating an approval stage
 */
export class CreateApprovalStageDto {
  // ==================== Stage Info ====================

  @ApiProperty({
    description: 'Stage name',
    example: 'Manager Approval',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Stage description',
    example: 'Approval by department manager',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Stage order (sequence)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  stageOrder!: number;

  // ==================== Approver Configuration ====================

  @ApiProperty({
    description: 'Approver type',
    enum: Object.values(ApproverType),
    enumName: 'ApproverType',
    example: ApproverType.ROLE_BASED,
  })
  @IsEnum(ApproverType)
  @IsNotEmpty()
  approverType!: ApproverType;

  @ApiPropertyOptional({
    description: 'Approver roles (for role_based type)',
    enum: Role,
    isArray: true,
    example: [Role.MANAGER, Role.ADMIN],
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  @IsOptional()
  approverRoles?: Role[];

  @ApiPropertyOptional({
    description: 'Approver user IDs (for user_based type)',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  approverUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Dynamic approver rules (for dynamic type)',
    example: { field: 'createdBy.managerId', condition: 'notNull' },
  })
  @IsObject()
  @IsOptional()
  dynamicApproverRules?: Record<string, unknown>;

  // ==================== Approval Requirements ====================

  @ApiPropertyOptional({
    description: 'Approval requirement type',
    enum: Object.values(ApprovalRequirementType),
    enumName: 'ApprovalRequirementType',
    example: ApprovalRequirementType.ANY,
    default: ApprovalRequirementType.ANY,
  })
  @IsEnum(ApprovalRequirementType)
  @IsOptional()
  approvalRequirementType?: ApprovalRequirementType;

  @ApiPropertyOptional({
    description: 'Required approvals count (for count type)',
    example: 2,
    minimum: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  requiredApprovalsCount?: number;

  // ==================== Stage Behavior ====================

  @ApiPropertyOptional({
    description: 'Is stage mandatory',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({
    description: 'Can skip this stage',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  canSkip?: boolean;

  @ApiPropertyOptional({
    description: 'Skip conditions (JSONB)',
    example: { amount: { lessThan: 5000 } },
  })
  @IsObject()
  @IsOptional()
  skipConditions?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Allow parallel approval',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowParallelApproval?: boolean;

  // ==================== Timeout ====================

  @ApiPropertyOptional({
    description: 'Timeout in hours',
    example: 24,
    minimum: 1,
    maximum: 720,
  })
  @IsInt()
  @Min(1)
  @Max(720)
  @IsOptional()
  @Type(() => Number)
  timeoutHours?: number;

  @ApiPropertyOptional({
    description: 'Auto action on timeout',
    enum: Object.values(AutoActionOnTimeout),
    enumName: 'AutoActionOnTimeout',
    example: AutoActionOnTimeout.ESCALATE,
  })
  @IsEnum(AutoActionOnTimeout)
  @IsOptional()
  autoActionOnTimeout?: AutoActionOnTimeout;
}

