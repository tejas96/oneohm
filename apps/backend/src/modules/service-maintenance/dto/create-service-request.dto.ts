import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceRequestPriority, ServiceRequestStatus } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for Resolution Attachment
 */
export class ResolutionAttachmentDto {
  @ApiProperty({
    description: 'File name',
    example: 'resolved.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'File path',
    example: '/uploads/resolutions/resolved.jpg',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 512000,
  })
  @IsInt()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  @IsOptional()
  mimeType?: string;
}

/**
 * DTO for Creating Service Request
 */
export class CreateServiceRequestDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  // ============================================
  // REQUEST INFO (Auto-generated)
  // ============================================
  // requestNumber is auto-generated in service

  @ApiPropertyOptional({
    description: 'Request date (YYYY-MM-DD)',
    example: '2024-11-12',
    default: 'Current date',
  })
  @IsDateString()
  @IsOptional()
  requestDate?: string;

  // ============================================
  // ISSUE DETAILS
  // ============================================

  @ApiProperty({
    description: 'Issue title',
    example: 'Solar panel not generating power',
  })
  @IsString()
  @IsNotEmpty()
  issueTitle: string;

  @ApiProperty({
    description: 'Issue description',
    example: 'The main solar panel stopped generating power since yesterday morning.',
  })
  @IsString()
  @IsNotEmpty()
  issueDescription: string;

  @ApiPropertyOptional({
    description: 'Issue category',
    example: 'Electrical',
  })
  @IsString()
  @IsOptional()
  issueCategory?: string;

  // ============================================
  // PRIORITY
  // ============================================

  @ApiPropertyOptional({
    description: 'Request priority',
    enum: ServiceRequestPriority,
    example: ServiceRequestPriority.MEDIUM,
    default: ServiceRequestPriority.MEDIUM,
  })
  @IsEnum(ServiceRequestPriority)
  @IsOptional()
  priority?: ServiceRequestPriority;

  // ============================================
  // ASSIGNMENT
  // ============================================

  @ApiPropertyOptional({
    description: 'Assigned to user ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string;

  // ============================================
  // SCHEDULE
  // ============================================

  @ApiPropertyOptional({
    description: 'Scheduled date (YYYY-MM-DD)',
    example: '2024-11-15',
  })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Completed date (YYYY-MM-DD)',
    example: '2024-11-16',
  })
  @IsDateString()
  @IsOptional()
  completedDate?: string;

  // ============================================
  // STATUS
  // ============================================

  @ApiPropertyOptional({
    description: 'Request status',
    enum: ServiceRequestStatus,
    example: ServiceRequestStatus.OPEN,
    default: ServiceRequestStatus.OPEN,
  })
  @IsEnum(ServiceRequestStatus)
  @IsOptional()
  status?: ServiceRequestStatus;

  // ============================================
  // CHARGEABLE
  // ============================================

  @ApiPropertyOptional({
    description: 'Is this service chargeable',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isChargeable?: boolean;

  @ApiPropertyOptional({
    description: 'Estimated cost',
    example: 5000.0,
  })
  @IsNumber()
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({
    description: 'Actual cost',
    example: 4500.0,
  })
  @IsNumber()
  @IsOptional()
  actualCost?: number;

  // ============================================
  // RESOLUTION
  // ============================================

  @ApiPropertyOptional({
    description: 'Resolution notes',
    example: 'Replaced faulty inverter circuit',
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Resolution attachments',
    type: [ResolutionAttachmentDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ResolutionAttachmentDto)
  resolutionAttachments?: ResolutionAttachmentDto[];

  // ============================================
  // CUSTOMER FEEDBACK
  // ============================================

  @ApiPropertyOptional({
    description: 'Customer rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  customerRating?: number;

  @ApiPropertyOptional({
    description: 'Customer feedback',
    example: 'Very satisfied with the quick resolution',
  })
  @IsString()
  @IsOptional()
  customerFeedback?: string;

  // ============================================
  // NOTES
  // ============================================

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Customer requested same-day service',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  // ============================================
  // AUDIT (OPTIONAL)
  // ============================================

  @ApiPropertyOptional({
    description: 'User who created this request',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
