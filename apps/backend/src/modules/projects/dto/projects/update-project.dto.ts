import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority } from '@tejas96/shared/types';
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
 *
 * Note: propertyId and quoteId cannot be changed after creation.
 * systemSizeKw, projectType, and estimatedCost are immutable — sourced from quote.
 * actualCost is accepted here but routed to metadata.actualCost by the service.
 */
export class UpdateProjectDto {
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

  // ==================== Priority & Progress ====================
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
    example: 345000,
    description: 'Actual project cost (stored in metadata.actualCost)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  actualCost?: number;

  // ==================== Inventory ====================
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'Default warehouse for stock allocation. Locked once any active allocation exists.',
  })
  @IsUUID()
  @IsOptional()
  defaultWarehouseId?: string;

  // ==================== Additional Data ====================
  @ApiPropertyOptional({
    example: { tags: ['priority', 'referral'], customField1: 'value1' },
    description: 'Additional project metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
