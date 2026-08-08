import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for updating stock (add/remove operations)
 */
export class UpdateStockDto {
  // ==================== Warehouse & Product ====================

  @ApiProperty({ example: 'uuid', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @ApiProperty({ example: 'uuid', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  // ==================== Transaction ====================

  @ApiProperty({ example: 100, description: 'Quantity to add (positive) or remove (negative)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({
    enum: Object.values(InventoryTransactionType),
    enumName: 'InventoryTransactionType',
    description: 'Transaction type',
  })
  @IsEnum(InventoryTransactionType)
  @IsNotEmpty()
  transactionType!: InventoryTransactionType;

  @ApiProperty({ example: 'purchase_order', description: 'Reference type' })
  @IsString()
  @IsNotEmpty()
  referenceType!: string;

  @ApiProperty({ example: 'uuid', description: 'Reference ID' })
  @IsString()
  @IsNotEmpty()
  referenceId!: string;

  // ==================== Optional Fields ====================

  @ApiProperty({ example: 'Stock received from PO-001', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 100, description: 'Minimum stock level', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minimumStockLevel?: number;

  @ApiProperty({ example: 1000, description: 'Maximum stock level', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maximumStockLevel?: number;

  // Organization ID (injected by controller)
}
