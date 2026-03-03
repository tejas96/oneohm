import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  TaskPriority,
  TaskStatus,
  type TaskChecklist,
  type FileAttachment,
} from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectTaskDto {
  @ApiPropertyOptional({
    description: 'Project ID (populated from route param)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Milestone ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Workflow Step ID (reference to shared workflow definition)',
  })
  @IsUUID()
  @IsOptional()
  workflowStepId?: string;

  @ApiPropertyOptional({
    description: 'Task name (required for ad-hoc tasks without workflowStepId)',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Task code (auto-generated if not provided)',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional({
    description: 'Kanban order within status column',
    example: 1000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  kanbanOrder?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO format)', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)', example: '2024-01-10' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    enum: Object.values(TaskStatus),
    enumName: 'TaskStatus',
    example: TaskStatus.TODO,
    default: TaskStatus.BACKLOG,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: Object.values(TaskPriority),
    enumName: 'TaskPriority',
    example: TaskPriority.HIGH,
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Task dependencies (UUIDs, max 50)', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  dependsOnTaskIds?: string[];

  @ApiPropertyOptional({
    description: 'Completion percentage',
    example: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  completionPercentage?: number;

  @ApiPropertyOptional({ description: 'Task checklist' })
  @IsObject()
  @IsOptional()
  checklist?: TaskChecklist;

  @ApiPropertyOptional({ description: 'Task attachments' })
  @IsArray()
  @IsOptional()
  attachments?: FileAttachment[];

  @ApiPropertyOptional({
    description: 'Task labels',
    type: [String],
    example: ['urgent', 'critical'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @ApiPropertyOptional({ description: 'Watcher user IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  watcherUserIds?: string[];

  @ApiPropertyOptional({ description: 'Blocked reason' })
  @IsString()
  @IsOptional()
  blockedReason?: string;
}
