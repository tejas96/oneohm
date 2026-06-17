import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type GpsCoordinates, type ShadingAnalysis } from '@tejas96/shared/types';
import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSiteActivityDto {
  @ApiProperty({ description: 'Property UUID to create site activity for' })
  @IsUUID()
  @IsOptional()
  propertyId!: string;

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
}
