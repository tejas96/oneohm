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
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating an existing project
 */
export class UpdateProjectDto {
  // ==================== Relations ====================
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Quote ID',
  })
  @IsUUID()
  @IsOptional()
  quoteId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Customer ID',
  })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project manager ID',
  })
  @IsUUID()
  @IsOptional()
  projectManagerId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Lead technician ID',
  })
  @IsUUID()
  @IsOptional()
  leadTechnicianId?: string;

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

  // ==================== Site Details ====================
  @ApiPropertyOptional({
    example: '123 Solar Street, Green City, GC 12345',
    description: 'Installation site address',
  })
  @IsString()
  @IsOptional()
  siteAddress?: string;

  @ApiPropertyOptional({
    example: { latitude: 28.6139, longitude: 77.209, altitude: 216 },
    description: 'GPS coordinates of the site',
  })
  @IsObject()
  @IsOptional()
  siteCoordinates?: { latitude: number; longitude: number; altitude?: number };

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
    description: 'Planned project start date',
  })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description: 'Planned project end date',
  })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-03',
    description: 'Actual project start date',
  })
  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @ApiPropertyOptional({
    example: '2025-03-20',
    description: 'Actual project end date',
  })
  @IsDateString()
  @IsOptional()
  actualEndDate?: string;

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
    example: 'Customer requests weekend-only installation',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    example: { tags: ['priority', 'referral'], customField1: 'value1' },
    description: 'Additional project metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
