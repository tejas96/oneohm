import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskType, type FileAttachment, type TaskChecklist } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

export class ProjectTaskResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  milestoneId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  taskTemplateId?: string;

  @ApiProperty({ example: 'Install solar panels' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'TASK-001' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'Install 20 solar panels on rooftop' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ enum: TaskType, example: TaskType.INSTALLATION })
  @Expose()
  type?: TaskType;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  assignedToUserId?: string;

  @ApiPropertyOptional({ example: 'Installation' })
  @Expose()
  assignedToDepartment?: string;

  @ApiProperty({ example: 1 })
  @Expose()
  sequenceOrder!: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @Expose()
  plannedStartDate?: Date;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @Expose()
  plannedEndDate?: Date;

  @ApiPropertyOptional({ example: '2024-01-02' })
  @Expose()
  actualStartDate?: Date;

  @ApiPropertyOptional({ example: '2024-01-09' })
  @Expose()
  actualEndDate?: Date;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @Expose()
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  @Expose()
  priority!: TaskPriority;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  dependsOnTaskIds?: string[];

  @ApiProperty({ example: false })
  @Expose()
  canRunParallel!: boolean;

  @ApiProperty({ example: 50 })
  @Expose()
  completionPercentage!: number;

  @ApiPropertyOptional()
  @Expose()
  checklist?: TaskChecklist;

  @ApiPropertyOptional()
  @Expose()
  attachments?: FileAttachment[];

  @ApiPropertyOptional({ example: 'All materials ready' })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({ example: 5 })
  @Expose()
  storyPoints?: number;

  @ApiPropertyOptional({ type: [String], example: ['urgent'] })
  @Expose()
  labels?: string[];

  @ApiPropertyOptional({ example: 8.5 })
  @Expose()
  estimatedHours?: number;

  @ApiProperty({ example: 0 })
  @Expose()
  loggedHours!: number;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  watcherUserIds?: string[];

  @ApiPropertyOptional({ example: 'Waiting for materials' })
  @Expose()
  blockedReason?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  updatedBy?: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  deletedAt?: Date;
}
