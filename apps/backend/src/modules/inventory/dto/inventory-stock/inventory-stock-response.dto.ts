import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

class InventoryStockProductSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Mono PERC Solar Panel 550W' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'PNL-550W-001' })
  @Expose()
  code!: string;

  @ApiProperty({ example: 'nos', required: false })
  @Expose({ name: 'unitOfMeasure' })
  unit?: string;
}

class InventoryStockWarehouseSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Main Warehouse Mumbai' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'WH-MUM-001' })
  @Expose()
  code!: string;
}

/**
 * Inventory Stock Response DTO
 * Represents stock data returned from API
 */
export class InventoryStockResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;


  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  warehouseId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId!: string;

  @ApiProperty({ type: InventoryStockProductSummaryDto, required: false })
  @Expose()
  @Type(() => InventoryStockProductSummaryDto)
  product?: InventoryStockProductSummaryDto;

  @ApiProperty({ type: InventoryStockWarehouseSummaryDto, required: false })
  @Expose()
  @Type(() => InventoryStockWarehouseSummaryDto)
  warehouse?: InventoryStockWarehouseSummaryDto;

  // ==================== Stock Levels ====================

  @ApiProperty({ example: 500 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  availableQuantity!: number;

  @ApiProperty({ example: 50 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  reservedQuantity!: number;

  @ApiProperty({ example: 100 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  inTransitQuantity!: number;

  // ==================== Reorder Settings ====================

  @ApiProperty({ example: 100, required: false })
  @Expose()
  @Transform(({ value }) => toNum(value))
  minimumStockLevel?: number;

  @ApiProperty({ example: 200, required: false })
  @Expose()
  @Transform(({ value }) => toNum(value))
  reorderQuantity?: number;

  @ApiProperty({ example: 1000, required: false })
  @Expose()
  @Transform(({ value }) => toNum(value))
  maximumStockLevel?: number;

  // ==================== Last Activity ====================

  @ApiProperty({ example: '2024-01-15', required: false })
  @Expose()
  @Type(() => Date)
  lastStockInDate?: Date;

  @ApiProperty({ example: '2024-01-20', required: false })
  @Expose()
  @Type(() => Date)
  lastStockOutDate?: Date;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
