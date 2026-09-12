import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type CustomerWhatsappStatus } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

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
    description: 'What happened to the customer WhatsApp update for this task (detail only)',
    nullable: true,
  })
  @Expose()
  @Transform(({ obj }) => (obj as { customerWhatsapp?: unknown }).customerWhatsapp ?? null)
  customerWhatsapp?: CustomerWhatsappStatus | null;

  @ApiPropertyOptional({
    example: 'Installation',
    description: 'Milestone name if task is linked to one',
  })
  @Expose()
  override milestoneName?: string;

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
