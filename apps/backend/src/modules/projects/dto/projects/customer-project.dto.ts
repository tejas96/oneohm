import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { ProjectListNextStepDto } from './project-list-item.dto';
import { ProjectResponseDto } from './project-response.dto';

/**
 * One of a customer's projects (`GET /projects/customer/:customerId`).
 *
 * The project itself plus the facts the project list shows on a row, read
 * from the same queries (`getListFacts`, `getTaskCounts`), so the customer
 * page and the project list can never name a different phase, next step or
 * meter date for one project.
 */
export class CustomerProjectDto extends ProjectResponseDto {
  @ApiProperty({ description: 'A net-meter installation step is done' })
  @Expose()
  meterInstalled!: boolean;

  @ApiPropertyOptional({
    example: '2026-09-12',
    nullable: true,
    description: 'India day the meter went in; null when not installed, or installed but undated',
  })
  @Expose()
  meterInstalledOn!: string | null;

  @ApiPropertyOptional({
    type: () => ProjectListNextStepDto,
    nullable: true,
    description:
      'The open step to do next (current phase first, then earliest due, then workflow order) and who holds it; null when nothing is open',
  })
  @Expose()
  @Type(() => ProjectListNextStepDto)
  nextStep!: ProjectListNextStepDto | null;

  @ApiProperty({ example: 42, description: 'All tasks of the project' })
  @Expose()
  totalTasks!: number;

  @ApiProperty({ example: 10, description: 'Tasks that are done' })
  @Expose()
  completedTasks!: number;
}
