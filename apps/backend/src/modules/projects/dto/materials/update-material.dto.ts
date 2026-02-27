import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating an existing project material
 */
export class UpdateMaterialDto {
  // ==================== Relations ====================
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID (if material is from product catalog)',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  // ==================== Material Details ====================
  @ApiPropertyOptional({
    example: 'Canadian Solar 550W Panel',
    description: 'Material/product name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  materialName?: string;

  @ApiPropertyOptional({
    example: 'Solar Panels',
    description: 'Material category',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  // ==================== Quantities ====================
  @ApiPropertyOptional({
    example: 12,
    description: 'Quantity required for the project',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityRequired?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Quantity allocated to the project',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityAllocated?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'Quantity actually used',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityUsed?: number;

  @ApiPropertyOptional({
    example: 'pcs',
    description: 'Unit of measurement',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  // ==================== Costs ====================
  @ApiPropertyOptional({
    example: 15000,
    description: 'Cost per unit',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  unitCost?: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Total cost (unit cost * quantity)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  totalCost?: number;

  // ==================== Dates ====================
  @ApiPropertyOptional({
    example: '2025-02-10',
    description: 'Date when material was procured',
  })
  @IsDateString()
  @IsOptional()
  procurementDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-15',
    description: 'Date when material was allocated to project',
  })
  @IsDateString()
  @IsOptional()
  allocationDate?: string;
}
