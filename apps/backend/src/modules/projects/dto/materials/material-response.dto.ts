import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialStatus } from '@oneohm-epc/shared-types';
import { Expose, Transform } from 'class-transformer';

import { toNum } from '../../../../common/utils';

/**
 * Project Material Response DTO
 * Serialized response for project material entities
 */
export class MaterialResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId?: string;

  @ApiProperty({ example: 'Canadian Solar 550W Panel' })
  @Expose()
  materialName!: string;

  @ApiPropertyOptional({ example: 'Solar Panels' })
  @Expose()
  category?: string;

  @ApiProperty({ example: 10 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  quantityRequired!: number;

  @ApiProperty({ example: 10 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  quantityAllocated!: number;

  @ApiProperty({ example: 8 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  quantityUsed!: number;

  @ApiProperty({ example: 'pcs' })
  @Expose()
  unit!: string;

  @ApiPropertyOptional({ example: 15000 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  unitCost?: number;

  @ApiPropertyOptional({ example: 150000 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  totalCost?: number;

  @ApiProperty({
    enum: Object.values(MaterialStatus),
    enumName: 'MaterialStatus',
    example: MaterialStatus.ALLOCATED,
  })
  @Expose()
  status!: MaterialStatus;

  @ApiPropertyOptional({ example: '2025-02-10' })
  @Expose()
  procurementDate?: Date;

  @ApiPropertyOptional({ example: '2025-02-15' })
  @Expose()
  allocationDate?: Date;

  @ApiProperty({ example: '2025-02-10T10:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-15T14:30:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  updatedBy?: string;

  @ApiPropertyOptional({ example: null })
  @Expose()
  deletedAt?: Date;
}
