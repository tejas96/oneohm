import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstallationCostComponents } from '@tejas96/shared/types';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateInstallationPricingDto {
  @ApiProperty({ example: 3, description: 'Minimum system size in KW (inclusive)' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  minSystemSizeKw!: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Maximum system size in KW (inclusive), null for unlimited',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSystemSizeKw?: number | null;

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
}
