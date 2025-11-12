import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Material Dispatch Item Response DTO
 * Represents dispatch item data returned from API
 */
export class MaterialDispatchItemResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  dispatchId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId!: string;

  // ==================== Quantity ====================

  @ApiProperty({ example: 50 })
  @Expose()
  quantity!: number;

  // ==================== Batch/Serial ====================

  @ApiProperty({ example: 'BATCH-2024-001', required: false })
  @Expose()
  batchNumber?: string;

  @ApiProperty({ example: ['SN-001', 'SN-002', 'SN-003'], required: false })
  @Expose()
  serialNumbers?: string[];

  // ==================== Notes ====================

  @ApiProperty({ example: 'Premium quality panels', required: false })
  @Expose()
  notes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}



