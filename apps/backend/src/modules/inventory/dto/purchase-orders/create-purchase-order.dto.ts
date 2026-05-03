import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PurchaseOrderType } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

/**
 * DTO for creating a purchase order
 */
export class CreatePurchaseOrderDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Vendor ID' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  // ==================== PO Info ====================

  @ApiProperty({ example: '2024-01-15', description: 'PO date', required: false })
  @IsDateString()
  @IsOptional()
  poDate?: string;

  // ==================== PO Type ====================

  @ApiProperty({
    enum: Object.values(PurchaseOrderType),
    enumName: 'PurchaseOrderType',
    example: PurchaseOrderType.STOCK,
    default: PurchaseOrderType.STOCK,
  })
  @IsEnum(PurchaseOrderType)
  @IsOptional()
  poType?: PurchaseOrderType;

  // ==================== Delivery ====================

  @ApiProperty({ example: '2024-02-15', required: false })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  // ==================== Financial ====================

  @ApiProperty({ example: 100000.0, description: 'Subtotal amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  subtotal!: number;

  @ApiProperty({ example: 18000.0, description: 'Tax amount', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;

  @ApiProperty({ example: 118000.0, description: 'Total amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  totalAmount!: number;

  // ==================== Payment ====================

  @ApiProperty({ example: 'Net 30 days', required: false })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({
    enum: Object.values(PaymentStatus),
    enumName: 'PaymentStatus',
    example: PaymentStatus.PENDING,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  // ==================== Status ====================

  // Note: status is NOT accepted from clients — service forces DRAFT on create.

  // ==================== Items ====================

  @ApiProperty({
    type: [CreatePurchaseOrderItemDto],
    description: 'PO line items',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];

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
