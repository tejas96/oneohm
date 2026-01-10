import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  type FileAttachment,
  type GpsCoordinates,
  type ShadingAnalysis,
} from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for creating a new site visit
 * Note: customerPropertyId comes from route parameter, not body
 */
export class CreateSiteVisitDto {
  // ==================== GPS ====================
  @ApiPropertyOptional({
    example: { latitude: 19.1136, longitude: 72.8697, accuracy: 5 },
    description: 'GPS coordinates with optional accuracy',
  })
  @IsObject()
  @IsOptional()
  gpsCoordinates?: GpsCoordinates;

  // ==================== Site Assessment ====================
  @ApiPropertyOptional({
    example: 500,
    description: 'Available roof area in square feet',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  availableRoofAreaSqft?: number;

  @ApiPropertyOptional({
    example: {
      hasShading: true,
      shadingPercentage: 15,
      shadingSource: ['trees', 'adjacent building'],
    },
    description: 'Shading analysis data',
  })
  @IsObject()
  @IsOptional()
  shadingAnalysis?: ShadingAnalysis;

  // ==================== Photos & Notes ====================
  @ApiPropertyOptional({
    description: 'Array of photo attachments',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        filename: { type: 'string' },
        fileType: { type: 'string' },
        fileSize: { type: 'number' },
        category: { type: 'string' },
      },
    },
  })
  @IsArray()
  @IsOptional()
  @Type(() => Object)
  photos?: FileAttachment[];

  @ApiPropertyOptional({
    example: 'Roof is flat with good sun exposure. Minor shading from adjacent tree.',
    description: 'Visit notes and observations',
  })
  @IsString()
  @IsOptional()
  visitNotes?: string;
}
