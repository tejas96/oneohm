import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalRequestPriority } from '@oneohm-epc/shared-types';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating an approval request
 */
export class UpdateApprovalRequestDto {
  // ==================== Request Info ====================

  @ApiPropertyOptional({
    description: 'Request title',
    example: 'Purchase Order Approval - PO-2024-001',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Request description',
    example: 'Approval needed for IT equipment purchase',
  })
  @IsString()
  @IsOptional()
  description?: string;

  // ==================== Priority ====================

  @ApiPropertyOptional({
    description: 'Request priority',
    enum: Object.values(ApprovalRequestPriority),
    enumName: 'ApprovalRequestPriority',
    example: ApprovalRequestPriority.HIGH,
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
