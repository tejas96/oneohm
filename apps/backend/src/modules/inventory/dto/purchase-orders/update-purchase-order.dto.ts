import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderType } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for updating a purchase order
 * All fields are optional
 */
export class UpdatePurchaseOrderDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  // ==================== PO Info ====================

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  poDate?: string;

  // ==================== PO Type ====================

  @ApiProperty({
    enum: Object.values(PurchaseOrderType),
    enumName: 'PurchaseOrderType',
    example: PurchaseOrderType.STOCK,
    required: false,
  })
  @IsEnum(PurchaseOrderType)
  @IsOptional()
  poType?: PurchaseOrderType;

  // ==================== Delivery ====================

  @ApiProperty({ example: '2024-02-15', required: false })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ example: '2024-02-10', required: false })
  @IsDateString()
  @IsOptional()
  actualDeliveryDate?: string;

  // ==================== Financial ====================

  @ApiProperty({ example: 100000.0, required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  subtotal?: number;

  @ApiProperty({ example: 18000.0, required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;

  @ApiProperty({ example: 118000.0, required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  totalAmount?: number;

  // ==================== Payment ====================

  @ApiProperty({ example: 'Net 30 days', required: false })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Urgent delivery required', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'Standard terms and conditions apply', required: false })
  @IsString()
  @IsOptional()
  termsConditions?: string;
}
