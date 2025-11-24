import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

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
  organizationId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  warehouseId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId!: string;

  // ==================== Stock Levels ====================

  @ApiProperty({ example: 500 })
  @Expose()
  availableQuantity!: number;

  @ApiProperty({ example: 50 })
  @Expose()
  reservedQuantity!: number;

  @ApiProperty({ example: 100 })
  @Expose()
  inTransitQuantity!: number;

  // ==================== Reorder Settings ====================

  @ApiProperty({ example: 100, required: false })
  @Expose()
  minimumStockLevel?: number;

  @ApiProperty({ example: 200, required: false })
  @Expose()
  reorderQuantity?: number;

  @ApiProperty({ example: 1000, required: false })
  @Expose()
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
