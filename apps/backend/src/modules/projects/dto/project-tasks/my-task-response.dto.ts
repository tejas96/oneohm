import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type TaskStatusConfig } from '@oneohm-epc/shared/types';
import { Expose, Type } from 'class-transformer';

import { ProjectTaskResponseDto } from './project-task-response.dto';

class ChecklistProgressDto {
  @ApiProperty({ example: 3 })
  @Expose()
  done!: number;

  @ApiProperty({ example: 5 })
  @Expose()
  total!: number;
}

/**
 * MyTaskResponseDto
 * Extends the base task DTO with project context fields for cross-project views.
 * The service must flatten relation data before transformation since
 * class-transformer cannot auto-map nested paths.
 */
export class MyTaskResponseDto extends ProjectTaskResponseDto {
  @ApiProperty({ example: 'PRJ-ONEOHM-2026-0001', description: 'Human-readable project code' })
  @Expose()
  projectNumber!: string;

  @ApiProperty({ example: 'Smith Residence Solar', description: 'Project name' })
  @Expose()
  projectName!: string;

  @ApiPropertyOptional({
    example: 'Installation',
    description: 'Milestone name if task is linked to one',
  })
  @Expose()
  milestoneName?: string;

  @ApiPropertyOptional({
    description: "Task statuses configured for this task's project",
    type: 'array',
  })
  @Expose()
  projectTaskStatuses?: TaskStatusConfig[];

  @ApiPropertyOptional({
    example: 145,
    description: 'Computed urgency score for intelligent sorting',
  })
  @Expose()
  urgencyScore?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the task is past its due date' })
  @Expose()
  isOverdue?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Days since the task was last updated' })
  @Expose()
  daysSinceLastUpdate?: number;

  @ApiPropertyOptional({ type: ChecklistProgressDto, description: 'Checklist completion progress' })
  @Expose()
  @Type(() => ChecklistProgressDto)
  checklistProgress?: ChecklistProgressDto;
}
