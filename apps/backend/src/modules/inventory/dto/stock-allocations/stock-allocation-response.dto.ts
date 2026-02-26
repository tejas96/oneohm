import { ApiProperty } from '@nestjs/swagger';
import { StockAllocationSourceType, StockAllocationStatus } from '@oneohm-epc/shared-types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

/**
 * Stock Allocation Response DTO
 * Represents stock allocation data returned from API
 */
export class StockAllocationResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  warehouseId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId!: string;

  // ==================== Allocation ====================

  @ApiProperty({ example: 100 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  allocatedQuantity!: number;

  @ApiProperty({ example: 50 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  dispatchedQuantity!: number;

  @ApiProperty({ example: 5 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  returnedQuantity!: number;

  // ==================== Source Type ====================

  @ApiProperty({
    enum: Object.values(StockAllocationSourceType),
    enumName: 'StockAllocationSourceType',
    example: StockAllocationSourceType.OWN,
  })
  @Expose()
  sourceType!: StockAllocationSourceType;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(StockAllocationStatus),
    enumName: 'StockAllocationStatus',
    example: StockAllocationStatus.ALLOCATED,
  })
  @Expose()
  status!: StockAllocationStatus;

  // ==================== Dates ====================

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  @Type(() => Date)
  allocatedAt!: Date;

  @ApiProperty({ example: '2024-01-20T14:00:00Z', required: false })
  @Expose()
  @Type(() => Date)
  dispatchedAt?: Date;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Reserved for Project XYZ installation', required: false })
  @Expose()
  notes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  createdBy?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  updatedBy?: string;
}
