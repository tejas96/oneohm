import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating an inventory transaction
 */
export class CreateInventoryTransactionDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  // ==================== Transaction Type ====================

  @ApiProperty({
    enum: Object.values(InventoryTransactionType),
    enumName: 'InventoryTransactionType',
    example: InventoryTransactionType.PURCHASE,
  })
  @IsEnum(InventoryTransactionType)
  @IsNotEmpty()
  transactionType!: InventoryTransactionType;

  // ==================== Quantity ====================

  @ApiProperty({ example: 100, description: 'Transaction quantity' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  // ==================== Reference ====================

  @ApiProperty({ example: 'purchase_order', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  referenceType?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  referenceId?: string;

  // ==================== Batch/Serial ====================

  @ApiProperty({ example: 'BATCH-2024-001', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  batchNumber?: string;

  @ApiProperty({ example: 'SN-123456', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  serialNumber?: string;

  // ==================== Transaction Date ====================

  @ApiProperty({ example: '2024-01-15T10:30:00Z', required: false })
  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  // ==================== Transfer Details ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  fromWarehouseId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  toWarehouseId?: string;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Received from PO-2024-001', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
