import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubsidySchemeType, ProjectType } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for subsidy tier
 */
export class SubsidyTierDto {
  @ApiProperty({ example: 0, description: 'Starting KW (inclusive)' })
  @IsNumber()
  @Min(0)
  fromKw!: number;

  @ApiProperty({ example: 2, description: 'Ending KW (exclusive), null for open-ended' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  toKw?: number | null;

  @ApiProperty({ example: 30000, description: 'Rate per KW in INR' })
  @IsNumber()
  @Min(0)
  ratePerKw!: number;
}

/**
 * DTO for creating a new subsidy configuration
 */
export class CreateSubsidyConfigurationDto {
  @ApiProperty({ example: 'PM Surya Ghar - Residential', description: 'Scheme display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  schemeName!: string;

  @ApiPropertyOptional({ example: 'PM-SURYA-RES', description: 'Unique scheme code' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  schemeCode?: string;

  @ApiProperty({
    enum: SubsidySchemeType,
    example: SubsidySchemeType.PM_SURYA_GHAR,
    description: 'Type of subsidy scheme',
  })
  @IsEnum(SubsidySchemeType)
  schemeType!: SubsidySchemeType;

  @ApiProperty({
    enum: ProjectType,
    example: ProjectType.RESIDENTIAL,
    description: 'Project type this subsidy applies to',
  })
  @IsEnum(ProjectType)
  projectType!: ProjectType;

  @ApiProperty({ example: 3, description: 'Maximum system size eligible for subsidy (KW)' })
  @IsNumber()
  @Min(0)
  maxSubsidyKw!: number;

  @ApiPropertyOptional({ example: 78000, description: 'Maximum subsidy amount (cap) in INR' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSubsidyAmount?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether DCR panels are required' })
  @IsBoolean()
  @IsOptional()
  requiresDcr?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether to auto-split DCR/Non-DCR' })
  @IsBoolean()
  @IsOptional()
  autoSplitEnabled?: boolean;

  @ApiProperty({
    type: [SubsidyTierDto],
    example: [
      { fromKw: 0, toKw: 2, ratePerKw: 30000 },
      { fromKw: 2, toKw: 3, ratePerKw: 18000 },
    ],
    description: 'Tiered subsidy rates',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubsidyTierDto)
  tiers!: SubsidyTierDto[];

  @ApiPropertyOptional({ example: true, description: 'Is configuration active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'PM Surya Ghar scheme for individual residential' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Effective from date' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Effective to date' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
