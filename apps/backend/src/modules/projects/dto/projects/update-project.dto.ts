import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating an existing project
 *
 * Note: propertyId cannot be changed after creation since it determines
 * the organization and customer associations, and enforces OneToOne relationship.
 */
export class UpdateProjectDto {
  // Note: propertyId is not updatable - it determines org/customer associations
  // and enforces the OneToOne relationship with Property

  // ==================== Project Info ====================
  @ApiPropertyOptional({
    example: 'Solar Installation - Smith Residence',
    description: 'Project name/title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: '5kW rooftop solar installation with battery storage',
    description: 'Project description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  // ==================== System Details ====================
  @ApiPropertyOptional({
    example: 5.5,
    description: 'System size in kilowatts',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  systemSizeKw?: number;

  @ApiPropertyOptional({
    example: 'residential',
    description: 'Project type (e.g., residential, commercial, industrial)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  projectType?: string;

  // ==================== Status & Progress ====================
  @ApiPropertyOptional({
    enum: Object.values(ProjectStatus),
    enumName: 'ProjectStatus',
    example: ProjectStatus.IN_PROGRESS,
    description: 'Project status',
  })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({
    enum: Object.values(ProjectPriority),
    enumName: 'ProjectPriority',
    example: ProjectPriority.HIGH,
    description: 'Project priority',
  })
  @IsEnum(ProjectPriority)
  @IsOptional()
  priority?: ProjectPriority;

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
