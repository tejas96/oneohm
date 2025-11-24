import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceTaskStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for Checklist Item
 */
export class ChecklistItemDto {
  @ApiProperty({
    description: 'Checklist item description',
    example: 'Check panel condition',
  })
  @IsString()
  @IsNotEmpty()
  item: string;

  @ApiProperty({
    description: 'Is item completed',
    example: false,
    default: false,
  })
  @IsOptional()
  completed: boolean = false;

  @ApiPropertyOptional({
    description: 'Completion date',
    example: '2024-04-15',
  })
  @IsString()
  @IsOptional()
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Item notes',
    example: 'All panels in good condition',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for Attachment
 */
export class AttachmentDto {
  @ApiProperty({
    description: 'File name',
    example: 'report.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'File path',
    example: '/uploads/reports/report.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsInt()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsString()
  @IsOptional()
  mimeType?: string;
}

/**
 * DTO for Creating Maintenance Task
 */
export class CreateMaintenanceTaskDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Maintenance Config ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  maintenanceConfigId: string;

  // ============================================
  // TASK INFO
  // ============================================

  @ApiProperty({
    description: 'Task name',
    example: 'First Maintenance Checkup',
  })
  @IsString()
  @IsNotEmpty()
  taskName: string;

  @ApiPropertyOptional({
    description: 'Task code',
    example: 'MAINT-001',
  })
  @IsString()
  @IsOptional()
  taskCode?: string;

  @ApiProperty({
    description: 'Interval number',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  intervalNumber: number;

  // ============================================
  // SCHEDULE
  // ============================================

  @ApiProperty({
    description: 'Scheduled date (YYYY-MM-DD)',
    example: '2024-04-15',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({
    description: 'Completed date (YYYY-MM-DD)',
    example: '2024-04-16',
  })
  @IsDateString()
  @IsOptional()
  completedDate?: string;

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

  @ApiPropertyOptional({
    description: 'Assigned to department',
    example: 'service',
    default: 'service',
  })
  @IsString()
  @IsOptional()
  assignedToDepartment?: string;

  // ============================================
  // STATUS
  // ============================================

  @ApiPropertyOptional({
    description: 'Task status',
    enum: MaintenanceTaskStatus,
    example: MaintenanceTaskStatus.SCHEDULED,
    default: MaintenanceTaskStatus.SCHEDULED,
  })
  @IsEnum(MaintenanceTaskStatus)
  @IsOptional()
  status?: MaintenanceTaskStatus;

  // ============================================
  // CHECKLIST
  // ============================================

  @ApiPropertyOptional({
    description: 'Task checklist',
    type: [ChecklistItemDto],
    example: [
      { item: 'Check panel condition', completed: false },
      { item: 'Test inverter', completed: false },
    ],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  // ============================================
  // FINDINGS
  // ============================================

  @ApiPropertyOptional({
    description: 'Task findings',
    example: 'All systems operational',
  })
  @IsString()
  @IsOptional()
  findings?: string;

  @ApiPropertyOptional({
    description: 'Issues found during task',
    example: 'Minor dust accumulation on panels',
  })
  @IsString()
  @IsOptional()
  issuesFound?: string;

  @ApiPropertyOptional({
    description: 'Actions taken to resolve issues',
    example: 'Cleaned panels and tested output',
  })
  @IsString()
  @IsOptional()
  actionsTaken?: string;

  // ============================================
  // ATTACHMENTS
  // ============================================

  @ApiPropertyOptional({
    description: 'Task attachments',
    type: [AttachmentDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  // ============================================
  // NOTES
  // ============================================

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Customer satisfied with service',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  // ============================================
  // AUDIT (OPTIONAL)
  // ============================================

  @ApiPropertyOptional({
    description: 'User who created this task',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
