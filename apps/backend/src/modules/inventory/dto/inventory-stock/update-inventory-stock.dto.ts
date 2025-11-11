import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * DTO for updating inventory stock
 * Used for manual stock adjustments and reorder settings
 */
export class UpdateInventoryStockDto {
  // ==================== Stock Levels ====================

  @ApiProperty({ example: 500, description: 'Available quantity', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  availableQuantity?: number;

  @ApiProperty({ example: 50, description: 'Reserved quantity', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  reservedQuantity?: number;

  @ApiProperty({ example: 100, description: 'In transit quantity', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  inTransitQuantity?: number;

  // ==================== Reorder Settings ====================

  @ApiProperty({ example: 100, description: 'Minimum stock level', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minimumStockLevel?: number;

  @ApiProperty({ example: 200, description: 'Reorder quantity', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  reorderQuantity?: number;

  @ApiProperty({ example: 1000, description: 'Maximum stock level', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maximumStockLevel?: number;

  // ==================== Last Activity ====================

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  lastStockInDate?: string;

  @ApiProperty({ example: '2024-01-20', required: false })
  @IsDateString()
  @IsOptional()
  lastStockOutDate?: string;
}



