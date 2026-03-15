import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemCategory } from '@oneohm-epc/shared/types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a quote line item
 */
export class QuoteLineItemDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID (if linking to product catalog)',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    enum: Object.values(ItemCategory),
    enumName: 'ItemCategory',
    example: ItemCategory.SOLAR_PANELS,
    description: 'Item category',
  })
  @IsEnum(ItemCategory)
  @IsNotEmpty()
  itemCategory!: ItemCategory;

  @ApiProperty({
    example: 'Jinko Solar Tiger Neo 550W',
    description: 'Item name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @ApiPropertyOptional({
    example: 'High-efficiency monocrystalline solar panel',
    description: 'Item description',
  })
  @IsString()
  @IsOptional()
  itemDescription?: string;

  @ApiPropertyOptional({
    example: {
      wattage: 550,
      efficiency: 21.5,
      voltage: '48V',
      dimensions: '2278x1134x35mm',
      weight: 27.5,
      additional: { cellType: 'Monocrystalline', warranty: '25 years' },
    },
    description: 'Product specifications (flexible JSONB structure)',
  })
  @IsObject()
  @IsOptional()
  specifications?: {
    wattage?: number;
    capacity?: number;
    voltage?: string;
    efficiency?: number;
    dimensions?: string;
    weight?: number;
    additional?: Record<string, unknown>;
  };

  @ApiProperty({
    example: 10,
    description: 'Quantity',
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity!: number;

  @ApiPropertyOptional({
    example: 'pcs',
    description: 'Unit of measure',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  unitOfMeasure?: string;

  @ApiProperty({
    example: 15000.0,
    description: 'Unit price in INR',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  unitPrice!: number;

  @ApiPropertyOptional({
    example: 12.0,
    description: 'Tax rate percentage (e.g., 12 for 12%)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Display order for sorting',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
