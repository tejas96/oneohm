import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for creating a purchase order item
 */
export class CreatePurchaseOrderItemDto {
  // ==================== Product ID ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  // ==================== Quantity ====================

  @ApiProperty({ example: 100, description: 'Ordered quantity' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  orderedQuantity!: number;

  // ==================== Pricing ====================

  @ApiProperty({ example: 1000.0, description: 'Unit price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  unitPrice!: number;

  @ApiProperty({ example: 18.0, description: 'Tax rate (%)', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  taxRate?: number;

  @ApiProperty({ example: 100000.0, description: 'Line total' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  lineTotal!: number;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Premium quality panels', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}



