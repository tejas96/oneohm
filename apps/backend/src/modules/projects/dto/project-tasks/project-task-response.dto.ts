import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TaskPriority,
  TaskStatus,
  type FileAttachment,
  type TaskActivityEntry,
  type TaskChecklist,
} from '@oneohm-epc/shared/types';
import { Expose, Transform } from 'class-transformer';

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

  @ApiPropertyOptional({ description: 'Workflow step reference ID' })
  @Expose()
  workflowStepId?: string;

  @ApiProperty({ example: 'Install solar panels' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'TASK-001' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'Install 20 solar panels on rooftop' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  assignedToUserId?: string;

  @ApiPropertyOptional({ example: 'Amit Sharma', description: 'Full name of the assigned user' })
  @Expose()
  @Transform(({ obj }) => {
    const assignee = obj.assignee;
    if (!assignee) return undefined;
    return [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || undefined;
  })
  assigneeName?: string;

  @ApiProperty({ example: 1000 })
  @Expose()
  kanbanOrder!: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @Expose()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @Expose()
  endDate?: Date;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @Expose()
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  @Expose()
  priority!: TaskPriority;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  dependsOnTaskIds?: string[];

  @ApiPropertyOptional({
    description: 'Whether any dependency tasks are incomplete (informational only)',
  })
  @Expose()
  hasDependencyBlockers?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Resolved names of dependency tasks' })
  @Expose()
  dependencyNames?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Task codes of dependency tasks' })
  @Expose()
  dependencyCodes?: string[];

  @ApiProperty({ example: 50 })
  @Expose()
  completionPercentage!: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  checklist?: TaskChecklist;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  attachments?: FileAttachment[];

  @ApiPropertyOptional({ type: [String], example: ['urgent'] })
  @Expose()
  labels?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  watcherUserIds?: string[];

  @ApiPropertyOptional({ example: 'Waiting for materials' })
  @Expose()
  blockedReason?: string;

  @ApiProperty({ type: 'array', description: 'Activity history for this task' })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  activityLog!: TaskActivityEntry[];

  @ApiProperty({ example: 1 })
  @Expose()
  version!: number;

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
