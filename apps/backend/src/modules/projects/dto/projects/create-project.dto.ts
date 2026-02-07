import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new project
 *
 * Note: organizationId and customerId are derived from the required propertyId.
 * Site address and coordinates are derived from property.address and property.locationCoordinates.
 *
 * Business Rule: One property can have only one project (OneToOne relationship)
 */
export class CreateProjectDto {
  // ==================== Relations ====================
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Property ID (required - customer and organization derived from property)',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId!: string;

  // ==================== Project Info ====================
  @ApiProperty({
    example: 'Solar Installation - Smith Residence',
    description: 'Project name/title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: '5kW rooftop solar installation with battery storage',
    description: 'Project description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  // ==================== System Details ====================
  @ApiProperty({
    example: 5.5,
    description: 'System size in kilowatts',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  systemSizeKw!: number;

  @ApiProperty({
    example: 'residential',
    description: 'Project type (e.g., residential, commercial, industrial)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  projectType!: string;

  // ==================== Status & Progress ====================
  @ApiPropertyOptional({
    enum: Object.values(ProjectStatus),
    enumName: 'ProjectStatus',
    example: ProjectStatus.DRAFT,
    description: 'Project status',
    default: ProjectStatus.DRAFT,
  })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({
    enum: Object.values(ProjectPriority),
    enumName: 'ProjectPriority',
    example: ProjectPriority.NORMAL,
    description: 'Project priority',
    default: ProjectPriority.NORMAL,
  })
  @IsEnum(ProjectPriority)
  @IsOptional()
  priority?: ProjectPriority;

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
    description: 'Project start date',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description: 'Project end date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  // ==================== Financials ====================
  @ApiPropertyOptional({
    example: 350000,
    description: 'Estimated project cost',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  estimatedCost?: number;

  @ApiPropertyOptional({
    example: 345000,
    description: 'Actual project cost',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  actualCost?: number;

  // ==================== Additional Data ====================
  @ApiPropertyOptional({
    example: { tags: ['priority', 'referral'], customField1: 'value1' },
    description: 'Additional project metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
