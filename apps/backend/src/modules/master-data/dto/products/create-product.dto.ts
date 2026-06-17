import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, UnitOfMeasure } from '@tejas96/shared/types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Product type ID',
  })
  @IsUUID()
  @IsNotEmpty()
  productTypeId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Brand ID',
  })
  @IsUUID()
  @IsNotEmpty()
  brandId!: string;

  @ApiProperty({ example: 'Jinko Solar Tiger Neo 550W', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'JINKO-550W', description: 'Unique product code/SKU' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({
    example: 'High-efficiency monocrystalline solar panel',
    description: 'Product description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'JKM550M-7RL4-V', description: 'Model number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  modelNumber?: string;

  @ApiPropertyOptional({
    example: {
      technology: 'perc',
      is_dcr: true,
      wattage: 550,
      min_wattage: 530,
      max_wattage: 550,
      efficiency: 21.5,
    },
    description: 'Flat JSONB specifications validated against product type attributes',
  })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    example: UnitOfMeasure.PIECES,
    description: 'Unit of measure',
    default: UnitOfMeasure.PIECES,
  })
  @IsEnum(UnitOfMeasure)
  @IsOptional()
  unitOfMeasure?: UnitOfMeasure;

  @ApiPropertyOptional({ example: 10, description: 'Product warranty in years' })
  @IsInt()
  @IsOptional()
  @Min(0)
  productWarrantyYears?: number;

  @ApiPropertyOptional({ example: 25, description: 'Performance warranty in years' })
  @IsInt()
  @IsOptional()
  @Min(0)
  performanceWarrantyYears?: number;

  @ApiPropertyOptional({
    enum: Object.values(ProductStatus),
    enumName: 'ProductStatus',
    example: ProductStatus.ACTIVE,
    description: 'Product status',
    default: ProductStatus.ACTIVE,
  })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
