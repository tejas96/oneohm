import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalRequestPriority } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating an approval request
 */
export class CreateApprovalRequestDto {
  // ==================== Organization ====================

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  // ==================== Template ====================

  @ApiProperty({
    description: 'Approval template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  templateId!: string;

  // ==================== Reference Info ====================

  @ApiProperty({
    description: 'Reference entity type',
    example: 'purchase_order',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  referenceType!: string;

  @ApiProperty({
    description: 'Reference entity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  referenceId!: string;

  // ==================== Request Info ====================

  @ApiProperty({
    description: 'Request title',
    example: 'Purchase Order Approval - PO-2024-001',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Request description',
    example: 'Approval needed for IT equipment purchase',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Amount (if applicable)',
    example: 85000.5,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  // ==================== Priority ====================

  @ApiPropertyOptional({
    description: 'Request priority',
    enum: Object.values(ApprovalRequestPriority),
    enumName: 'ApprovalRequestPriority',
    example: ApprovalRequestPriority.NORMAL,
    default: ApprovalRequestPriority.NORMAL,
  })
  @IsEnum(ApprovalRequestPriority)
  @IsOptional()
  priority?: ApprovalRequestPriority;

  // ==================== Metadata ====================

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { department: 'IT', projectCode: 'PROJ-123' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
