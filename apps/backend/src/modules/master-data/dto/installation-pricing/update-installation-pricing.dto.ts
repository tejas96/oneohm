import { ApiPropertyOptional } from '@nestjs/swagger';
import { InstallationCostComponents } from '@oneohm-epc/shared/types';
import { IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, Min } from 'class-validator';

export class UpdateInstallationPricingDto {
  @ApiPropertyOptional({ example: 3, description: 'Minimum system size in KW' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minSystemSizeKw?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum system size in KW' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSystemSizeKw?: number | null;

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
}
