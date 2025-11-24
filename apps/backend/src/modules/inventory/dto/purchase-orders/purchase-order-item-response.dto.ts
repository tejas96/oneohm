import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Purchase Order Item Response DTO
 * Represents PO item data returned from API
 */
export class PurchaseOrderItemResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  purchaseOrderId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId!: string;

  // ==================== Quantity ====================

  @ApiProperty({ example: 100 })
  @Expose()
  orderedQuantity!: number;

  @ApiProperty({ example: 95 })
  @Expose()
  receivedQuantity!: number;

  // ==================== Pricing ====================

  @ApiProperty({ example: 1000.0 })
  @Expose()
  unitPrice!: number;

  @ApiProperty({ example: 18.0, required: false })
  @Expose()
  taxRate?: number;

  @ApiProperty({ example: 100000.0 })
  @Expose()
  lineTotal!: number;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Premium quality panels', required: false })
  @Expose()
  notes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}
