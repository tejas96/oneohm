import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SiteActivityStatus,
  type GpsCoordinates,
  type ShadingAnalysis,
  type SurveyData,
} from '@oneohm-epc/shared/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

@Exclude()
class CustomerInfoDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() firstName!: string;
  @ApiPropertyOptional() @Expose() lastName?: string;
  @ApiPropertyOptional() @Expose() phone?: string;
}

@Exclude()
class PropertyInfoDto {
  @ApiProperty() @Expose() id!: string;
  @ApiPropertyOptional() @Expose() propertyName?: string;
  @ApiProperty() @Expose() propertyType!: string;
  @ApiPropertyOptional() @Expose() address?: string;
  @ApiPropertyOptional() @Expose() city?: string;
  @ApiPropertyOptional() @Expose() state?: string;
  @ApiPropertyOptional() @Expose() pincode?: string;
  @ApiProperty() @Expose() @Type(() => CustomerInfoDto) customer?: CustomerInfoDto;
}

@Exclude()
export class SiteActivityResponseDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() organizationId!: string;
  @ApiProperty() @Expose() customerPropertyId!: string;
  @ApiProperty() @Expose() activityNumber!: string;

  @ApiProperty({ enum: SiteActivityStatus })
  @Expose()
  overallStatus!: SiteActivityStatus;

  @ApiProperty() @Expose() isSiteVisitDone!: boolean;
  @ApiProperty() @Expose() isSiteSurveyDone!: boolean;

  @ApiPropertyOptional() @Expose() completedBy?: string;
  @ApiPropertyOptional() @Expose() completedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.gpsCoordinates)
  gpsCoordinates?: GpsCoordinates;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => toNum(value))
  availableRoofAreaSqft?: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.shadingAnalysis)
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional() @Expose() notes?: string;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.surveyData)
  surveyData?: SurveyData;

  @ApiPropertyOptional() @Expose() surveyorId?: string;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.metadata)
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => PropertyInfoDto)
  customerProperty?: PropertyInfoDto;

  @ApiProperty() @Expose() createdAt!: Date;
  @ApiProperty() @Expose() updatedAt!: Date;
  @ApiPropertyOptional() @Expose() createdBy?: string;
  @ApiPropertyOptional() @Expose() updatedBy?: string;
}
