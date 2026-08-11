import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@tejas96/shared/types';
import { Expose } from 'class-transformer';

export class MyTaskListItemDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiProperty()
  @Expose()
  code!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiPropertyOptional()
  @Expose()
  milestoneName?: string | null;

  @ApiProperty({ enum: TaskPriority })
  @Expose()
  priority!: TaskPriority;

  @ApiProperty({ enum: TaskStatus })
  @Expose()
  status!: TaskStatus;

  @ApiPropertyOptional()
  @Expose()
  endDate?: string;

  @ApiProperty()
  @Expose()
  completionPercentage!: number;

  @ApiProperty()
  @Expose()
  projectNumber!: string;

  @ApiProperty()
  @Expose()
  projectName!: string;

  @ApiPropertyOptional()
  @Expose()
  isOverdue?: boolean;

  @ApiPropertyOptional()
  @Expose()
  daysSinceLastUpdate?: number;

  @ApiPropertyOptional()
  @Expose()
  hasDependencyBlockers?: boolean;

  @ApiPropertyOptional({ description: 'Latest comment text for row preview' })
  @Expose()
  latestCommentPreview?: string;
}
