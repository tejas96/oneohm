// ============================================
// IMPORTS
// ============================================
// Shared types
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for creating a task time log entry
 */
export class CreateTaskTimeLogDto {
  // ============================================
  // REQUIRED FIELDS
  // ============================================
  @ApiProperty({
    description: 'Task ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @ApiProperty({
    description: 'User ID who logged the time',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Time spent in hours',
    example: 2.5,
    minimum: 0.25,
    maximum: 24,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(24)
  @IsNotEmpty()
  @Type(() => Number)
  timeSpentHours!: number;

  @ApiProperty({
    description: 'Date of work',
    example: '2024-01-15',
    type: Date,
  })
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  workDate!: Date;

  // ============================================
  // OPTIONAL FIELDS
  // ============================================
  @ApiPropertyOptional({
    description: 'Description of work done',
    example: 'Implemented authentication module',
  })
  @IsString()
  @IsOptional()
  workDescription?: string;

  @ApiPropertyOptional({
    description: 'Whether this time is billable',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;
}

