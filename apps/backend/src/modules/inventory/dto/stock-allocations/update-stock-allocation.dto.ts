import { ApiProperty } from '@nestjs/swagger';
import { StockAllocationSourceType } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for updating a stock allocation
 * All fields are optional
 */
export class UpdateStockAllocationDto {
  // ==================== Allocation ====================

  @ApiProperty({ example: 100, required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  allocatedQuantity?: number;

  @ApiProperty({ example: 50, required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  dispatchedQuantity?: number;

  @ApiProperty({ example: 5, required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  returnedQuantity?: number;

  // ==================== Source Type ====================

  @ApiProperty({
    enum: Object.values(StockAllocationSourceType),
    enumName: 'StockAllocationSourceType',
    example: StockAllocationSourceType.OWN,
    required: false,
  })
  @IsEnum(StockAllocationSourceType)
  @IsOptional()
  sourceType?: StockAllocationSourceType;

  // ==================== Dates ====================

  @ApiProperty({ example: '2024-01-15T10:30:00Z', required: false })
  @IsDateString()
  @IsOptional()
  dispatchedAt?: string;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Partially dispatched', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
