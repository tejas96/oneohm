import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  type TaskChecklist,
  type FileAttachment,
} from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectTaskDto {
  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({
    description: 'Milestone ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Task Template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  taskTemplateId?: string;

  @ApiProperty({ description: 'Task name', example: 'Install solar panels', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Task code', example: 'TASK-001', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: Object.values(TaskType),
    enumName: 'TaskType',
    example: TaskType.INSTALLATION,
  })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Assigned department', example: 'Installation' })
  @IsString()
  @IsOptional()
  assignedToDepartment?: string;

  @ApiProperty({ description: 'Sequence order', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  sequenceOrder!: number;

  @ApiPropertyOptional({ description: 'Planned start date', example: '2024-01-01' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  plannedStartDate?: Date;

  @ApiPropertyOptional({ description: 'Planned end date', example: '2024-01-10' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  plannedEndDate?: Date;

  @ApiPropertyOptional({
    enum: Object.values(TaskStatus),
    enumName: 'TaskStatus',
    example: TaskStatus.TODO,
    default: TaskStatus.PENDING,
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

  @ApiPropertyOptional({ description: 'Task dependencies (UUIDs)', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  dependsOnTaskIds?: string[];

  @ApiPropertyOptional({ description: 'Can run in parallel', example: false })
  @IsBoolean()
  @IsOptional()
  canRunParallel?: boolean;

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

  @ApiPropertyOptional({ description: 'Task notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Story points', example: 5, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  storyPoints?: number;

  @ApiPropertyOptional({
    description: 'Task labels',
    type: [String],
    example: ['urgent', 'critical'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @ApiPropertyOptional({ description: 'Estimated hours', example: 8.5, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  estimatedHours?: number;

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
