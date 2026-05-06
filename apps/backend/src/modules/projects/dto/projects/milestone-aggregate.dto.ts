import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class MilestoneAggregateDto {
  @ApiProperty({ example: 'Installation', description: 'Milestone display name' })
  name!: string;

  @ApiProperty({ example: 6, description: 'Sort order — lower = earlier in project lifecycle' })
  order!: number;

  @ApiProperty({ example: 10, description: 'Total non-cancelled tasks in this milestone group' })
  totalTasks!: number;

  @ApiProperty({ example: 7, description: 'Number of DONE tasks' })
  completedTasks!: number;

  @ApiProperty({ example: 2, description: 'Number of IN_PROGRESS or IN_REVIEW tasks' })
  inProgressTasks!: number;

  @ApiProperty({ example: 0, description: 'Number of BLOCKED tasks' })
  blockedTasks!: number;

  @ApiProperty({ example: 70.0, description: 'Completion percentage (0–100)' })
  percent!: number;

  @ApiProperty({
    example: 'in_progress',
    description: 'Derived milestone status based on task states',
    enum: ['pending', 'in_progress', 'completed', 'blocked', 'no_tasks'],
  })
  status!: string;
}

export class RenameMilestoneDto {
  @ApiProperty({ description: 'Current milestone name', example: 'Instal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  from!: string;

  @ApiProperty({ description: 'New milestone name', example: 'Installation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  to!: string;

  @ApiPropertyOptional({
    description: 'New sort order (leave undefined to keep current)',
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
