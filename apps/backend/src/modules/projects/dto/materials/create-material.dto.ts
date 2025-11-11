import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new project material
 */
export class CreateMaterialDto {
  // ==================== Relations ====================
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project ID',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID (if material is from product catalog)',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  // ==================== Material Details ====================
  @ApiProperty({
    example: 'Canadian Solar 550W Panel',
    description: 'Material/product name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  materialName!: string;

  @ApiPropertyOptional({
    example: 'Solar Panels',
    description: 'Material category',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  // ==================== Quantities ====================
  @ApiProperty({
    example: 10,
    description: 'Quantity required for the project',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  quantityRequired!: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Quantity allocated to the project',
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityAllocated?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Quantity actually used',
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityUsed?: number;

  @ApiProperty({
    example: 'pcs',
    description: 'Unit of measurement',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

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

  // ==================== Status & Dates ====================
  @ApiPropertyOptional({
    enum: Object.values(MaterialStatus),
    enumName: 'MaterialStatus',
    example: MaterialStatus.REQUIRED,
    description: 'Material procurement status',
    default: MaterialStatus.REQUIRED,
  })
  @IsEnum(MaterialStatus)
  @IsOptional()
  status?: MaterialStatus;

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

  // ==================== Additional Data ====================
  @ApiPropertyOptional({
    example: 'Store in dry location, handle with care',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
