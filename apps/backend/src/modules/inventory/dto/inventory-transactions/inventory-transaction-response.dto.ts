import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

/**
 * Inventory Transaction Response DTO
 * Represents transaction data returned from API
 */
export class InventoryTransactionResponseDto {
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

  // ==================== Transaction Type ====================

  @ApiProperty({
    enum: Object.values(InventoryTransactionType),
    enumName: 'InventoryTransactionType',
    example: InventoryTransactionType.PURCHASE,
  })
  @Expose()
  transactionType!: InventoryTransactionType;

  // ==================== Quantity ====================

  @ApiProperty({ example: 100 })
  @Expose()
  quantity!: number;

  // ==================== Reference ====================

  @ApiProperty({ example: 'purchase_order', required: false })
  @Expose()
  referenceType?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  referenceId?: string;

  // ==================== Batch/Serial ====================

  @ApiProperty({ example: 'BATCH-2024-001', required: false })
  @Expose()
  batchNumber?: string;

  @ApiProperty({ example: 'SN-123456', required: false })
  @Expose()
  serialNumber?: string;

  // ==================== Transaction Date ====================

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  @Type(() => Date)
  transactionDate!: Date;

  // ==================== Transfer Details ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  fromWarehouseId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  toWarehouseId?: string;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Received from PO-2024-001', required: false })
  @Expose()
  notes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  createdBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}
