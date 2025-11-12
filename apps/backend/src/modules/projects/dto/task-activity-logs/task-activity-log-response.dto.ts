// ============================================
// IMPORTS
// ============================================
// Shared types
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Response DTO for task activity log
 * Represents a single activity/change in a task's history
 */
export class TaskActivityLogResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  taskId!: string;

  @ApiProperty({
    example: 'status_changed',
    description: "Activity type: 'status_changed', 'assigned', 'commented', 'updated'",
  })
  @Expose()
  activityType!: string;

  @ApiPropertyOptional({ example: 'status' })
  @Expose()
  fieldName?: string;

  @ApiPropertyOptional({ example: 'in_progress' })
  @Expose()
  oldValue?: string;

  @ApiPropertyOptional({ example: 'completed' })
  @Expose()
  newValue?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  userId?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}
