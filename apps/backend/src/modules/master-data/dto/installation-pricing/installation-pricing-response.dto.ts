import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstallationCostComponents } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

export class InstallationPricingResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;


  @ApiProperty({ example: 3 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  minSystemSizeKw!: number;

  @ApiPropertyOptional({ example: 3 })
  @Expose()
  @Transform(({ value }) => (value != null ? toNum(value) : null))
  maxSystemSizeKw!: number | null;

  @ApiProperty({
    example: {
      electrical_work: 4200,
      fixed_material: 8500,
      variable_floor: 4548,
      structure_cost: 13336,
      installation_labor: 4400,
      msedcl_charges: 1500,
      loading_unloading: 1500,
    },
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  costComponents!: InstallationCostComponents;

  @ApiProperty({ example: 35 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  transportRatePerKm!: number;

  @ApiProperty({ example: 25 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  floorIncrementPercent!: number;

  @ApiProperty({ example: 18 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  gstRate!: number;

  @ApiProperty({ example: '2024-01-01' })
  @Expose()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @Expose()
  effectiveTo?: Date;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;
}

export class InstallationPricingListResponseDto {
  @ApiProperty({ type: [InstallationPricingResponseDto] })
  @Expose()
  @Type(() => InstallationPricingResponseDto)
  data!: InstallationPricingResponseDto[];

  @ApiProperty({ example: 100 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;
}
