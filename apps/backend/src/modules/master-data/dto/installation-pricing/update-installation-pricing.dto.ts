import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, InstallationCostComponents } from '@oneohm-epc/shared-types';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating an installation pricing configuration
 */
export class UpdateInstallationPricingDto {
  @ApiPropertyOptional({ example: 'Installation Charges 3KW', description: 'Display name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'INST-3KW', description: 'Unique code' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 3, description: 'Minimum system size in KW' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minSystemSizeKw?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum system size in KW' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSystemSizeKw?: number;

  @ApiPropertyOptional({
    enum: ProjectType,
    example: ProjectType.RESIDENTIAL,
    description: 'Project type',
  })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @ApiPropertyOptional({
    example: {
      electrical_work: 4500,
      fixed_material: 9000,
    },
    description: 'Cost components to update (merged with existing)',
  })
  @IsObject()
  @IsOptional()
  costComponents?: InstallationCostComponents;

  @ApiPropertyOptional({ example: 40, description: 'Transport rate per KM' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  transportRatePerKm?: number;

  @ApiPropertyOptional({ example: 25, description: 'Floor increment percentage' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  floorIncrementPercent?: number;

  @ApiPropertyOptional({ example: 18, description: 'GST rate percentage' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  gstRate?: number;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Effective from date' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Effective to date' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true, description: 'Is pricing active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
