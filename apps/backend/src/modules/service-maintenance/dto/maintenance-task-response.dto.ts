import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceTaskStatus } from '@oneohm-epc/shared/types';
import { Expose, Type } from 'class-transformer';

import { MaintenanceConfigResponseDto } from './maintenance-config-response.dto';
import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * DTO for Checklist Item Response
 */
export class ChecklistItemResponseDto {
  @ApiProperty({ description: 'Checklist item', example: 'Check panel condition' })
  @Expose()
  item: string;

  @ApiProperty({ description: 'Is completed', example: false })
  @Expose()
  completed: boolean;

  @ApiPropertyOptional({ description: 'Completed at', example: '2024-04-15' })
  @Expose()
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Notes', example: 'All panels in good condition' })
  @Expose()
  notes?: string;
}

/**
 * DTO for Attachment Response
 */
export class AttachmentResponseDto {
  @ApiProperty({ description: 'File name', example: 'report.pdf' })
  @Expose()
  fileName: string;

  @ApiProperty({ description: 'File path', example: '/uploads/reports/report.pdf' })
  @Expose()
  filePath: string;

  @ApiPropertyOptional({ description: 'File size', example: 1024000 })
  @Expose()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  @Expose()
  mimeType?: string;
}

/**
 * Response DTO for Maintenance Task
 */
export class MaintenanceTaskResponseDto {
  @ApiProperty({ description: 'Task ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  projectId: string;

  @ApiProperty({
    description: 'Maintenance Config ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @Expose()
  maintenanceConfigId: string;

  @ApiProperty({ description: 'Task name', example: 'First Maintenance Checkup' })
  @Expose()
  taskName: string;

  @ApiPropertyOptional({ description: 'Task code', example: 'MAINT-001' })
  @Expose()
  taskCode?: string;

  @ApiProperty({ description: 'Interval number', example: 1 })
  @Expose()
  intervalNumber: number;

  @ApiProperty({ description: 'Scheduled date', example: '2024-04-15' })
  @Expose()
  scheduledDate: Date;

  @ApiPropertyOptional({ description: 'Completed date', example: '2024-04-16' })
  @Expose()
  completedDate?: Date;

  @ApiPropertyOptional({
    description: 'Assigned to user ID',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @Expose()
  assignedToUserId?: string;

  @ApiProperty({ description: 'Assigned to department', example: 'service' })
  @Expose()
  assignedToDepartment: string;

  @ApiPropertyOptional({ description: 'Assigned at timestamp' })
  @Expose()
  assignedAt?: Date;

  @ApiProperty({
    description: 'Task status',
    enum: MaintenanceTaskStatus,
    example: MaintenanceTaskStatus.SCHEDULED,
  })
  @Expose()
  status: MaintenanceTaskStatus;

  @ApiPropertyOptional({
    description: 'Task checklist',
    type: [ChecklistItemResponseDto],
  })
  @Expose()
  @Type(() => ChecklistItemResponseDto)
  checklist?: ChecklistItemResponseDto[];

  @ApiPropertyOptional({ description: 'Task findings', example: 'All systems operational' })
  @Expose()
  findings?: string;

  @ApiPropertyOptional({
    description: 'Issues found',
    example: 'Minor dust accumulation on panels',
  })
  @Expose()
  issuesFound?: string;

  @ApiPropertyOptional({
    description: 'Actions taken',
    example: 'Cleaned panels and tested output',
  })
  @Expose()
  actionsTaken?: string;

  @ApiPropertyOptional({
    description: 'Task attachments',
    type: [AttachmentResponseDto],
  })
  @Expose()
  @Type(() => AttachmentResponseDto)
  attachments?: AttachmentResponseDto[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string;

  // Relations
  @ApiPropertyOptional({ description: 'Organization details', type: OrganizationResponseDto })
  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  @ApiPropertyOptional({
    description: 'Maintenance config details',
    type: MaintenanceConfigResponseDto,
  })
  @Expose()
  @Type(() => MaintenanceConfigResponseDto)
  maintenanceConfig?: MaintenanceConfigResponseDto;

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
