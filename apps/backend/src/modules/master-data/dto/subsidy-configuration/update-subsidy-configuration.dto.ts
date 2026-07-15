import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubsidySchemeType, ProjectType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { SubsidyTierDto } from './create-subsidy-configuration.dto';

/**
 * DTO for updating a subsidy configuration
 */
export class UpdateSubsidyConfigurationDto {
  @ApiPropertyOptional({ example: 'PM Surya Ghar - Updated' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  schemeName?: string;

  @ApiPropertyOptional({ example: 'PM-SURYA-RES-V2' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  schemeCode?: string;

  @ApiPropertyOptional({ enum: SubsidySchemeType })
  @IsEnum(SubsidySchemeType)
  @IsOptional()
  schemeType?: SubsidySchemeType;

  @ApiPropertyOptional({ enum: ProjectType })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSubsidyKw?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSubsidyAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  requiresDcr?: boolean;

  @ApiPropertyOptional({ type: [SubsidyTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubsidyTierDto)
  @IsOptional()
  tiers?: SubsidyTierDto[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
