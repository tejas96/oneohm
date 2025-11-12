import { ApiProperty } from '@nestjs/swagger';
import { StockAllocationSourceType, StockAllocationStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * DTO for creating a stock allocation
 */
export class CreateStockAllocationDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  // ==================== Allocation ====================

  @ApiProperty({ example: 100, description: 'Allocated quantity' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  allocatedQuantity!: number;

  // ==================== Source Type ====================

  @ApiProperty({
    enum: Object.values(StockAllocationSourceType),
    enumName: 'StockAllocationSourceType',
    example: StockAllocationSourceType.OWN,
    default: StockAllocationSourceType.OWN,
  })
  @IsEnum(StockAllocationSourceType)
  @IsOptional()
  sourceType?: StockAllocationSourceType;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(StockAllocationStatus),
    enumName: 'StockAllocationStatus',
    example: StockAllocationStatus.ALLOCATED,
    default: StockAllocationStatus.ALLOCATED,
  })
  @IsEnum(StockAllocationStatus)
  @IsOptional()
  status?: StockAllocationStatus;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Reserved for Project XYZ installation', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}



