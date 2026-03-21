import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@oneohm-epc/shared/types';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductPriceDto {
  @ApiProperty({ example: 34.5, description: 'Unit price (per watt or unit)' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 1.2, description: 'Cost multiplier for structures' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costMultiplier?: number;

  @ApiProperty({ example: 12, description: 'GST rate percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate!: number;

  @ApiPropertyOptional({ example: 'INR', description: 'Currency code (ISO 4217)' })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    enum: ProjectType,
    description: 'Optional project type specific pricing',
  })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @ApiProperty({ example: '2024-01-01', description: 'Effective from date' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Effective to date' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
