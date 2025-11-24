import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialStatus } from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';

/**
 * Project Material Response DTO
 * Serialized response for project material entities
 */
export class MaterialResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId?: string;

  @ApiProperty({ example: 'Canadian Solar 550W Panel' })
  @Expose()
  materialName!: string;

  @ApiPropertyOptional({ example: 'Solar Panels' })
  @Expose()
  category?: string;

  @ApiProperty({ example: 10 })
  @Expose()
  quantityRequired!: number;

  @ApiProperty({ example: 10 })
  @Expose()
  quantityAllocated!: number;

  @ApiProperty({ example: 8 })
  @Expose()
  quantityUsed!: number;

  @ApiProperty({ example: 'pcs' })
  @Expose()
  unit!: string;

  @ApiPropertyOptional({ example: 15000 })
  @Expose()
  unitCost?: number;

  @ApiPropertyOptional({ example: 150000 })
  @Expose()
  totalCost?: number;

  @ApiProperty({
    enum: Object.values(MaterialStatus),
    enumName: 'MaterialStatus',
    example: MaterialStatus.ALLOCATED,
  })
  @Expose()
  status!: MaterialStatus;

  @ApiPropertyOptional({ example: '2025-02-10' })
  @Expose()
  procurementDate?: Date;

  @ApiPropertyOptional({ example: '2025-02-15' })
  @Expose()
  allocationDate?: Date;

  @ApiPropertyOptional({ example: 'Material received in good condition' })
  @Expose()
  notes?: string;

  @ApiProperty({ example: '2025-02-10T10:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-15T14:30:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  @Expose()
  deletedAt?: Date;
}
