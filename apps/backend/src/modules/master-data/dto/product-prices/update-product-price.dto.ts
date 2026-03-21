import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@oneohm-epc/shared/types';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductPriceDto {
  @ApiPropertyOptional({ example: 34.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 1.2 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costMultiplier?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: ProjectType, nullable: true })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType | null;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
