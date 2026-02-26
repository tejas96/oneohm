import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SiteVisitStatus,
  type FileAttachment,
  type GpsCoordinates,
  type ShadingAnalysis,
} from '@oneohm-epc/shared-types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

/**
 * Nested customer info for site visit response
 */
@Exclude()
class CustomerInfoDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  firstName!: string;

  @ApiPropertyOptional()
  @Expose()
  lastName?: string;

  @ApiPropertyOptional()
  @Expose()
  phone?: string;
}

/**
 * Nested property info for site visit response
 */
@Exclude()
class PropertyInfoDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiPropertyOptional()
  @Expose()
  propertyName?: string;

  @ApiProperty()
  @Expose()
  propertyType!: string;

  @ApiPropertyOptional()
  @Expose()
  address?: string;

  @ApiPropertyOptional()
  @Expose()
  city?: string;

  @ApiPropertyOptional()
  @Expose()
  state?: string;

  @ApiPropertyOptional()
  @Expose()
  pincode?: string;

  @ApiProperty()
  @Expose()
  @Type(() => CustomerInfoDto)
  customer?: CustomerInfoDto;
}

/**
 * DTO for site visit response
 * Used in API responses to control what data is exposed
 */
@Exclude()
export class SiteVisitResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  customerPropertyId!: string;

  @ApiProperty()
  @Expose()
  visitNumber!: string;

  @ApiProperty({ enum: SiteVisitStatus })
  @Expose()
  status!: SiteVisitStatus;

  // ==================== GPS ====================
  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.gpsCoordinates)
  gpsCoordinates?: GpsCoordinates;

  // ==================== Site Assessment ====================
  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => toNum(value))
  availableRoofAreaSqft?: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.shadingAnalysis)
  shadingAnalysis?: ShadingAnalysis;

  // ==================== Photos & Notes ====================
  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.photos)
  photos?: FileAttachment[];

  @ApiPropertyOptional()
  @Expose()
  visitNotes?: string;

  // ==================== Nested Property & Customer Info ====================
  @ApiPropertyOptional()
  @Expose()
  @Type(() => PropertyInfoDto)
  customerProperty?: PropertyInfoDto;

  // ==================== Audit Fields ====================
  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;
}
