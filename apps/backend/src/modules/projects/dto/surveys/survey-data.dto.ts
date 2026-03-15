import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoofCondition,
  RoofOrientation,
  type ElectricalDetails,
  type ShadingAnalysis,
} from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * DTO for validating the nested survey_data JSONB payload
 */
export class SurveyDataDto {
  @ApiPropertyOptional({ example: 'Concrete flat roof', description: 'Type of roof' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  roofType?: string;

  @ApiPropertyOptional({
    enum: Object.values(RoofCondition),
    enumName: 'RoofCondition',
    example: RoofCondition.GOOD,
    description: 'Condition of the roof',
  })
  @IsEnum(RoofCondition)
  @IsOptional()
  roofCondition?: RoofCondition;

  @ApiPropertyOptional({
    enum: Object.values(RoofOrientation),
    enumName: 'RoofOrientation',
    example: RoofOrientation.SOUTH,
    description: 'Primary orientation of the roof',
  })
  @IsEnum(RoofOrientation)
  @IsOptional()
  roofOrientation?: RoofOrientation;

  @ApiPropertyOptional({ example: 15.5, description: 'Roof tilt angle in degrees' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  roofTiltAngle?: number;

  @ApiPropertyOptional({ example: 85.5, description: 'Available roof area in square meters' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  availableAreaSqm?: number;

  @ApiPropertyOptional({
    example: { hasShading: true, shadingPercentage: 15, shadingSource: ['trees'] },
    description: 'Shading analysis results',
  })
  @IsObject()
  @IsOptional()
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional({
    example: { panelType: 'MCB', panelCapacity: 60, voltage: 240, phaseType: 'single_phase' },
    description: 'Electrical system details',
  })
  @IsObject()
  @IsOptional()
  electricalDetails?: ElectricalDetails;

  @ApiPropertyOptional({
    example: 'Roof structure is sound, no repairs needed',
    description: 'Structural assessment notes',
  })
  @IsString()
  @IsOptional()
  structuralAssessment?: string;

  @ApiPropertyOptional({
    example: 'Easy access via external staircase',
    description: 'Site access description',
  })
  @IsString()
  @IsOptional()
  siteAccess?: string;

  @ApiPropertyOptional({
    example: 'Working at height - safety harness required',
    description: 'Safety concerns or requirements',
  })
  @IsString()
  @IsOptional()
  safetyConcerns?: string;

  @ApiPropertyOptional({
    example: 'Recommend additional mounting brackets for wind load',
    description: 'Recommendations from survey',
  })
  @IsString()
  @IsOptional()
  recommendations?: string;

  @ApiPropertyOptional({
    example: 'Customer requests installation to start ASAP',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
