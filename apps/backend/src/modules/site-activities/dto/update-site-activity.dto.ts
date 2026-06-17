import { ApiPropertyOptional } from '@nestjs/swagger';
import { type GpsCoordinates, type ShadingAnalysis, type SurveyData } from '@tejas96/shared/types';
import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSiteActivityDto {
  @ApiPropertyOptional({ description: 'GPS coordinates' })
  @IsObject()
  @IsOptional()
  gpsCoordinates?: GpsCoordinates;

  @ApiPropertyOptional({ description: 'Available roof area in sqft' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  availableRoofAreaSqft?: number;

  @ApiPropertyOptional({ description: 'Shading analysis data' })
  @IsObject()
  @IsOptional()
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Survey assessment data (JSONB)' })
  @IsObject()
  @IsOptional()
  surveyData?: SurveyData;
}
