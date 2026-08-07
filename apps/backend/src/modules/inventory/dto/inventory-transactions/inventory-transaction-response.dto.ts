import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

class TransactionWarehouseSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Main Warehouse Mumbai' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'WH-MUM-001', required: false })
  @Expose()
  code?: string;
}

class TransactionProductSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Mono PERC Solar Panel 550W' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'PNL-550W-001', required: false })
  @Expose()
  code?: string;
}

class TransactionCreatorSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Sanjay' })
  @Expose()
  firstName?: string;

  @ApiProperty({ example: 'Patil' })
  @Expose()
  lastName?: string;

  @ApiProperty({ example: 'Sanjay Patil', required: false })
  @Expose()
  @Transform(
    ({ obj }) => [obj.firstName, obj.lastName].filter(Boolean).join(' ').trim() || undefined,
  )
  name?: string;
}

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
  warehouseId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId!: string;

  @ApiProperty({ type: TransactionWarehouseSummaryDto, required: false })
  @Expose()
  @Type(() => TransactionWarehouseSummaryDto)
  warehouse?: TransactionWarehouseSummaryDto;

  @ApiProperty({ type: TransactionProductSummaryDto, required: false })
  @Expose()
  @Type(() => TransactionProductSummaryDto)
  product?: TransactionProductSummaryDto;

  @ApiProperty({ type: TransactionWarehouseSummaryDto, required: false })
  @Expose()
  @Type(() => TransactionWarehouseSummaryDto)
  fromWarehouse?: TransactionWarehouseSummaryDto;

  @ApiProperty({ type: TransactionWarehouseSummaryDto, required: false })
  @Expose()
  @Type(() => TransactionWarehouseSummaryDto)
  toWarehouse?: TransactionWarehouseSummaryDto;

  @ApiProperty({ type: TransactionCreatorSummaryDto, required: false })
  @Expose()
  @Type(() => TransactionCreatorSummaryDto)
  creator?: TransactionCreatorSummaryDto;

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
  @Transform(({ value }) => toNum(value))
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
