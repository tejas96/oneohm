import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceRequestPriority, ServiceRequestStatus } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';
import { CustomerResponseDto } from '../../customers/dto/customer-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * DTO for Resolution Attachment Response
 */
export class ResolutionAttachmentResponseDto {
  @ApiProperty({ description: 'File name', example: 'resolved.jpg' })
  @Expose()
  fileName: string;

  @ApiProperty({ description: 'File path', example: '/uploads/resolutions/resolved.jpg' })
  @Expose()
  filePath: string;

  @ApiPropertyOptional({ description: 'File size', example: 512000 })
  @Expose()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type', example: 'image/jpeg' })
  @Expose()
  mimeType?: string;
}

/**
 * Response DTO for Service Request
 */
export class ServiceRequestResponseDto {
  @ApiProperty({ description: 'Request ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  projectId: string;

  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  @Expose()
  customerId: string;

  @ApiProperty({ description: 'Request number', example: 'SR-2024-001' })
  @Expose()
  requestNumber: string;

  @ApiProperty({ description: 'Request date', example: '2024-11-12' })
  @Expose()
  requestDate: Date;

  @ApiProperty({ description: 'Issue title', example: 'Solar panel not generating power' })
  @Expose()
  issueTitle: string;

  @ApiProperty({
    description: 'Issue description',
    example: 'The main solar panel stopped generating power since yesterday morning.',
  })
  @Expose()
  issueDescription: string;

  @ApiPropertyOptional({ description: 'Issue category', example: 'Electrical' })
  @Expose()
  issueCategory?: string;

  @ApiProperty({
    description: 'Request priority',
    enum: ServiceRequestPriority,
    example: ServiceRequestPriority.MEDIUM,
  })
  @Expose()
  priority: ServiceRequestPriority;

  @ApiPropertyOptional({
    description: 'Assigned to user ID',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @Expose()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Assigned at timestamp' })
  @Expose()
  assignedAt?: Date;

  @ApiPropertyOptional({ description: 'Scheduled date', example: '2024-11-15' })
  @Expose()
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Completed date', example: '2024-11-16' })
  @Expose()
  completedDate?: Date;

  @ApiProperty({
    description: 'Request status',
    enum: ServiceRequestStatus,
    example: ServiceRequestStatus.OPEN,
  })
  @Expose()
  status: ServiceRequestStatus;

  @ApiProperty({ description: 'Is chargeable', example: false })
  @Expose()
  isChargeable: boolean;

  @ApiPropertyOptional({ description: 'Estimated cost', example: 5000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Actual cost', example: 4500.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  actualCost?: number;

  @ApiPropertyOptional({
    description: 'Resolution notes',
    example: 'Replaced faulty inverter circuit',
  })
  @Expose()
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Resolution attachments',
    type: [ResolutionAttachmentResponseDto],
  })
  @Expose()
  @Type(() => ResolutionAttachmentResponseDto)
  resolutionAttachments?: ResolutionAttachmentResponseDto[];

  @ApiPropertyOptional({ description: 'Customer rating (1-5)', example: 5 })
  @Expose()
  customerRating?: number;

  @ApiPropertyOptional({
    description: 'Customer feedback',
    example: 'Very satisfied with the quick resolution',
  })
  @Expose()
  customerFeedback?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Deleted at timestamp' })
  @Expose()
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string;

  // Relations
  @Expose()
  @ApiPropertyOptional({ description: 'Customer details', type: CustomerResponseDto })
  @Expose()
  @Type(() => CustomerResponseDto)
  customer?: CustomerResponseDto;

  @ApiPropertyOptional({ description: 'Assigned to user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  assignedToUser?: UserResponseDto;

  @ApiPropertyOptional({ description: 'Created by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;

  @ApiPropertyOptional({ description: 'Updated by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  updatedByUser?: UserResponseDto;
}
