import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { ProjectTaskResponseDto } from './project-task-response.dto';

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

  @ApiPropertyOptional({ example: 'Installation', description: 'Milestone name if task is linked to one' })
  @Expose()
  milestoneName?: string;
}
