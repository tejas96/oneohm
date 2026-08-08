import { ApiProperty } from '@nestjs/swagger';
import { MaterialDispatchStatus } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

import { MaterialDispatchItemResponseDto } from './material-dispatch-item-response.dto';

class DispatchProjectSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Residential Rooftop - Sharma' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'PRJ-2026-001', required: false })
  @Expose()
  projectNumber?: string;
}

class DispatchWarehouseSummaryDto {
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

/**
 * Material Dispatch Response DTO
 * Represents material dispatch data returned from API
 */
export class MaterialDispatchResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  warehouseId!: string;

  @ApiProperty({ type: DispatchProjectSummaryDto, required: false })
  @Expose()
  @Type(() => DispatchProjectSummaryDto)
  project?: DispatchProjectSummaryDto;

  @ApiProperty({ type: DispatchWarehouseSummaryDto, required: false })
  @Expose()
  @Type(() => DispatchWarehouseSummaryDto)
  warehouse?: DispatchWarehouseSummaryDto;

  // ==================== Dispatch Info ====================

  @ApiProperty({ example: 'DISP-2024-001' })
  @Expose()
  dispatchNumber!: string;

  @ApiProperty({ example: '2024-01-15' })
  @Expose()
  @Type(() => Date)
  dispatchDate!: Date;

  // ==================== Delivery ====================

  @ApiProperty({ example: '2024-01-20', required: false })
  @Expose()
  @Type(() => Date)
  expectedDeliveryDate?: Date;

  @ApiProperty({ example: '2024-01-19', required: false })
  @Expose()
  @Type(() => Date)
  actualDeliveryDate?: Date;

  // ==================== Transport ====================

  @ApiProperty({ example: 'MH-01-AB-1234', required: false })
  @Expose()
  vehicleNumber?: string;

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @Expose()
  driverName?: string;

  @ApiProperty({ example: '+91-9876543210', required: false })
  @Expose()
  driverPhone?: string;

  @ApiProperty({ example: 'ABC Transport Company', required: false })
  @Expose()
  transportCompany?: string;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(MaterialDispatchStatus),
    enumName: 'MaterialDispatchStatus',
    example: MaterialDispatchStatus.DISPATCHED,
  })
  @Expose()
  status!: MaterialDispatchStatus;

  // ==================== Delivery Confirmation ====================

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @Expose()
  deliveredBy?: string;

  @ApiProperty({ example: 'Site Manager - Amit Shah', required: false })
  @Expose()
  receivedBy?: string;

  @ApiProperty({ example: 'base64-encoded-signature', required: false })
  @Expose()
  receiverSignature?: string;

  // ==================== Items ====================

  @ApiProperty({ type: [MaterialDispatchItemResponseDto], required: false })
  @Expose()
  @Type(() => MaterialDispatchItemResponseDto)
  items?: MaterialDispatchItemResponseDto[];

  // ==================== Notes ====================

  @ApiProperty({ example: 'Handle with care', required: false })
  @Expose()
  notes?: string;

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
