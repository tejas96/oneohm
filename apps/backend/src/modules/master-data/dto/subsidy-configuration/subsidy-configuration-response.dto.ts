import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubsidySchemeType, ProjectType } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

/**
 * DTO for subsidy tier response
 */
export class SubsidyTierResponseDto {
  @ApiProperty({ example: 0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  fromKw!: number;

  @ApiProperty({ example: 2 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  toKw!: number;

  @ApiProperty({ example: 30000 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  ratePerKw!: number;
}

/**
 * DTO for subsidy configuration response
 */
export class SubsidyConfigurationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: 'PM Surya Ghar - Residential' })
  @Expose()
  schemeName!: string;

  @ApiPropertyOptional({ example: 'PM-SURYA-RES' })
  @Expose()
  schemeCode?: string;

  @ApiProperty({ enum: SubsidySchemeType, example: SubsidySchemeType.PM_SURYA_GHAR })
  @Expose()
  schemeType!: SubsidySchemeType;

  @ApiProperty({ enum: ProjectType, example: ProjectType.RESIDENTIAL })
  @Expose()
  projectType!: ProjectType;

  @ApiProperty({ example: 3 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  maxSubsidyKw!: number;

  @ApiPropertyOptional({ example: 78000 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  maxSubsidyAmount?: number;

  @ApiProperty({ example: true })
  @Expose()
  requiresDcr!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  autoSplitEnabled!: boolean;

  @ApiProperty({
    type: [SubsidyTierResponseDto],
    example: [
      { fromKw: 0, toKw: 2, ratePerKw: 30000 },
      { fromKw: 2, toKw: 3, ratePerKw: 18000 },
    ],
  })
  @Expose()
  @Type(() => SubsidyTierResponseDto)
  tiers!: SubsidyTierResponseDto[];

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'PM Surya Ghar scheme for individual residential' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @Expose()
  effectiveFrom?: Date;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @Expose()
  effectiveTo?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;
}

/**
 * DTO for paginated subsidy configurations response
 */
export class SubsidyConfigurationListResponseDto {
  @ApiProperty({ type: [SubsidyConfigurationResponseDto] })
  @Expose()
  @Type(() => SubsidyConfigurationResponseDto)
  data!: SubsidyConfigurationResponseDto[];

  @ApiProperty({ example: 10 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;
}
