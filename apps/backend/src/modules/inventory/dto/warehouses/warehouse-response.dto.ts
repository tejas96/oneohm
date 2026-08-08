import { ApiProperty } from '@nestjs/swagger';
import { WarehouseStatus, WarehouseType, type WarehouseCoordinates } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

/**
 * Warehouse Response DTO
 * Represents warehouse data returned from API
 */
export class WarehouseResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  // ==================== Basic Info ====================

  @ApiProperty({ example: 'Main Warehouse Mumbai' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'WH-MUM-001' })
  @Expose()
  code!: string;

  // ==================== Location ====================

  @ApiProperty({ example: '123 Industrial Area, Andheri East', required: false })
  @Expose()
  address?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @Expose()
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @Expose()
  state?: string;

  @ApiProperty({ example: 'India' })
  @Expose()
  country!: string;

  @ApiProperty({ example: '400069', required: false })
  @Expose()
  pincode?: string;

  @ApiProperty({
    example: { latitude: 19.1136, longitude: 72.8697 },
    required: false,
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  coordinates?: WarehouseCoordinates;

  // ==================== Type ====================

  @ApiProperty({
    enum: Object.values(WarehouseType),
    enumName: 'WarehouseType',
    example: WarehouseType.OWN,
  })
  @Expose()
  warehouseType!: WarehouseType;

  // ==================== Manager ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  warehouseManagerId?: string;

  // ==================== Contact ====================

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @Expose()
  contactPerson?: string;

  @ApiProperty({ example: '+91-9876543210', required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ example: 'warehouse@example.com', required: false })
  @Expose()
  email?: string;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(WarehouseStatus),
    enumName: 'WarehouseStatus',
    example: WarehouseStatus.ACTIVE,
  })
  @Expose()
  status!: WarehouseStatus;

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
