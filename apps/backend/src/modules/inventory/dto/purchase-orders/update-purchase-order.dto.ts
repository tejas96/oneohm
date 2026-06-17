import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderType } from '@tejas96/shared/types';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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
  //
  // subtotal / taxAmount / totalAmount are intentionally NOT accepted
  // here. Totals are server-derived from line items at create time and
  // are immutable through generic update — preventing clients from
  // editing the stored payable amount without changing the underlying
  // lines.

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
