import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@oneohm-epc/shared/types';
import { Expose, Transform } from 'class-transformer';

import { toNum } from '../../../../common/utils';

export class ProductPriceResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  productId!: string;

  @ApiPropertyOptional({ enum: ProjectType })
  @Expose()
  projectType?: ProjectType;

  @ApiProperty({ example: 34.5 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  unitPrice!: number;

  @ApiProperty({ example: 1.2 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  costMultiplier!: number;

  @ApiProperty({ example: 12 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  gstRate!: number;

  @ApiProperty({ example: 'INR' })
  @Expose()
  currency!: string;

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
