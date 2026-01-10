import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, InstallationCostComponents } from '@oneohm-epc/shared-types';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new installation pricing configuration
 *
 * @example
 * {
 *   name: "Installation Charges 3KW",
 *   code: "INST-3KW",
 *   minSystemSizeKw: 3,
 *   maxSystemSizeKw: 3,
 *   projectType: "residential",
 *   costComponents: {
 *     electrical_work: 4200,
 *     fixed_material: 8500,
 *     variable_floor: 4548,
 *     structure_cost: 13336,
 *     installation_labor: 4400,
 *     msedcl_charges: 1500,
 *     loading_unloading: 1500
 *   },
 *   transportRatePerKm: 35,
 *   floorIncrementPercent: 25,
 *   gstRate: 18,
 *   effectiveFrom: "2024-01-01"
 * }
 */
export class CreateInstallationPricingDto {
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

  @ApiProperty({ example: 3, description: 'Minimum system size in KW (inclusive)' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  minSystemSizeKw!: number;

  @ApiProperty({ example: 3, description: 'Maximum system size in KW (inclusive)' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  maxSystemSizeKw!: number;

  @ApiPropertyOptional({
    enum: ProjectType,
    example: ProjectType.RESIDENTIAL,
    description: 'Project type this pricing applies to',
  })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @ApiProperty({
    example: {
      electrical_work: 4200,
      fixed_material: 8500,
      variable_floor: 4548,
      structure_cost: 13336,
      installation_labor: 4400,
      msedcl_charges: 1500,
      loading_unloading: 1500,
    },
    description: 'Cost components in INR (dynamic JSONB)',
  })
  @IsObject()
  @IsNotEmpty()
  costComponents!: InstallationCostComponents;

  @ApiPropertyOptional({ example: 35, description: 'Transport rate per KM in INR' })
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

  @ApiProperty({ example: '2024-01-01', description: 'Effective from date' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Effective to date' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true, description: 'Is pricing active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Pricing for 3KW residential systems' })
  @IsString()
  @IsOptional()
  notes?: string;
}
