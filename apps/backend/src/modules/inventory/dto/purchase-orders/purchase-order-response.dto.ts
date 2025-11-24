import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PurchaseOrderStatus, PurchaseOrderType } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

import { PurchaseOrderItemResponseDto } from './purchase-order-item-response.dto';

/**
 * Purchase Order Response DTO
 * Represents purchase order data returned from API
 */
export class PurchaseOrderResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  vendorId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  warehouseId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  projectId?: string;

  // ==================== PO Info ====================

  @ApiProperty({ example: 'PO-2024-001' })
  @Expose()
  poNumber!: string;

  @ApiProperty({ example: '2024-01-15' })
  @Expose()
  @Type(() => Date)
  poDate!: Date;

  // ==================== PO Type ====================

  @ApiProperty({
    enum: Object.values(PurchaseOrderType),
    enumName: 'PurchaseOrderType',
    example: PurchaseOrderType.STOCK,
  })
  @Expose()
  poType!: PurchaseOrderType;

  // ==================== Delivery ====================

  @ApiProperty({ example: '2024-02-15', required: false })
  @Expose()
  @Type(() => Date)
  expectedDeliveryDate?: Date;

  @ApiProperty({ example: '2024-02-10', required: false })
  @Expose()
  @Type(() => Date)
  actualDeliveryDate?: Date;

  // ==================== Financial ====================

  @ApiProperty({ example: 100000.0 })
  @Expose()
  subtotal!: number;

  @ApiProperty({ example: 18000.0 })
  @Expose()
  taxAmount!: number;

  @ApiProperty({ example: 118000.0 })
  @Expose()
  totalAmount!: number;

  // ==================== Payment ====================

  @ApiProperty({ example: 'Net 30 days', required: false })
  @Expose()
  paymentTerms?: string;

  @ApiProperty({
    enum: Object.values(PaymentStatus),
    enumName: 'PaymentStatus',
    example: PaymentStatus.PENDING,
  })
  @Expose()
  paymentStatus!: PaymentStatus;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(PurchaseOrderStatus),
    enumName: 'PurchaseOrderStatus',
    example: PurchaseOrderStatus.APPROVED,
  })
  @Expose()
  status!: PurchaseOrderStatus;

  // ==================== Items ====================

  @ApiProperty({ type: [PurchaseOrderItemResponseDto], required: false })
  @Expose()
  @Type(() => PurchaseOrderItemResponseDto)
  items?: PurchaseOrderItemResponseDto[];

  // ==================== Notes ====================

  @ApiProperty({ example: 'Urgent delivery required', required: false })
  @Expose()
  notes?: string;

  @ApiProperty({ example: 'Standard terms and conditions apply', required: false })
  @Expose()
  termsConditions?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  createdBy?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  updatedBy?: string;
}
