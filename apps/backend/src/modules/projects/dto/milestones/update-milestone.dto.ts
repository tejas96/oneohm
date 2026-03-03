import { ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneType, type MilestoneDeliverable } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating an existing project milestone
 */
export class UpdateMilestoneDto {
  // ==================== Relations ====================
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to assign this milestone to',
  })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  // ==================== Milestone Info ====================
  @ApiPropertyOptional({
    example: 'Site Survey Completion',
    description: 'Milestone name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example:
      'Complete detailed site assessment including roof measurements and electrical inspection',
    description: 'Milestone description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: Object.values(MilestoneType),
    enumName: 'MilestoneType',
    example: MilestoneType.INSTALLATION,
    description: 'Type of milestone',
  })
  @IsEnum(MilestoneType)
  @IsOptional()
  milestoneType?: MilestoneType;

  @ApiPropertyOptional({
    example: 2,
    description: 'Order/sequence of this milestone in the project',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  sequenceOrder?: number;

  // ==================== Progress ====================
  @ApiPropertyOptional({
    example: 45,
    description: 'Progress percentage (0-100)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  progressPercentage?: number;

  // ==================== Dates ====================
  @ApiPropertyOptional({
    example: '2025-02-01',
    description: 'Start date',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-05',
    description: 'End date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  // ==================== Dependencies & Deliverables ====================
  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Array of milestone IDs that must be completed before this one',
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  dependencies?: string[];

  @ApiPropertyOptional({
    example: [
      {
        name: 'Site Survey Report',
        type: 'document',
        isCompleted: true,
        completionDate: '2025-02-04',
      },
    ],
    description: 'Deliverables for this milestone',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  deliverables?: MilestoneDeliverable[];
}
