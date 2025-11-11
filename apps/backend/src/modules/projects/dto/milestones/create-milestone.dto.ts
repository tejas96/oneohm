import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus, MilestoneType, type MilestoneDeliverable } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new project milestone
 */
export class CreateMilestoneDto {
  // ==================== Relations ====================
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project ID',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to assign this milestone to',
  })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  // ==================== Milestone Info ====================
  @ApiProperty({
    example: 'Site Survey Completion',
    description: 'Milestone name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: 'Complete detailed site assessment including roof measurements and electrical inspection',
    description: 'Milestone description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: Object.values(MilestoneType),
    enumName: 'MilestoneType',
    example: MilestoneType.SITE_SURVEY,
    description: 'Type of milestone',
  })
  @IsEnum(MilestoneType)
  @IsNotEmpty()
  milestoneType!: MilestoneType;

  @ApiPropertyOptional({
    enum: Object.values(MilestoneStatus),
    enumName: 'MilestoneStatus',
    example: MilestoneStatus.PENDING,
    description: 'Milestone status',
    default: MilestoneStatus.PENDING,
  })
  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @ApiProperty({
    example: 1,
    description: 'Order/sequence of this milestone in the project',
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  sequenceOrder!: number;

  // ==================== Progress ====================
  @ApiPropertyOptional({
    example: 0,
    description: 'Progress percentage (0-100)',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  progressPercentage?: number;

  // ==================== Dates ====================
  @ApiPropertyOptional({
    example: '2025-02-01',
    description: 'Planned start date',
  })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-05',
    description: 'Planned end date',
  })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-02',
    description: 'Actual start date',
  })
  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-04',
    description: 'Actual end date',
  })
  @IsDateString()
  @IsOptional()
  actualEndDate?: string;

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
        isCompleted: false,
      },
    ],
    description: 'Deliverables for this milestone',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  deliverables?: MilestoneDeliverable[];

  // ==================== Additional Data ====================
  @ApiPropertyOptional({
    example: 'Weather dependent - reschedule if rain',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

