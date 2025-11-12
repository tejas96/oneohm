// ============================================
// IMPORTS
// ============================================
// Shared types
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Response DTO for task time log
 */
export class TaskTimeLogResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  taskId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  userId!: string;

  @ApiProperty({ example: 2.5 })
  @Expose()
  timeSpentHours!: number;

  @ApiProperty({ example: '2024-01-15' })
  @Expose()
  @Type(() => Date)
  workDate!: Date;

  @ApiPropertyOptional({ example: 'Implemented authentication module' })
  @Expose()
  workDescription?: string;

  @ApiProperty({ example: true })
  @Expose()
  isBillable!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  createdBy?: string;
}
