import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, UnitOfMeasure } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

export class ProductResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;


  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  productTypeId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  @Expose()
  brandId!: string;

  @ApiPropertyOptional({
    description: 'Brand relation (when loaded)',
    example: { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Jinko Solar' },
  })
  @Expose()
  @Transform(({ obj }) => {
    const brand = obj?.brand;
    return brand && typeof brand === 'object' && brand.id
      ? { id: brand.id, name: brand.name }
      : undefined;
  })
  brand?: { id: string; name: string };

  @ApiProperty({ example: 'Jinko Solar Tiger Neo 550W' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'JINKO-550W' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'High-efficiency monocrystalline solar panel' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: 'JKM550M-7RL4-V' })
  @Expose()
  modelNumber?: string;

  @ApiPropertyOptional({
    description: 'Flat JSONB specifications',
    example: {
      technology: 'perc',
      is_dcr: true,
      wattage: 550,
      min_wattage: 530,
      max_wattage: 550,
      efficiency: 21.5,
    },
  })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  specifications?: Record<string, unknown>;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PIECES })
  @Expose()
  unitOfMeasure!: UnitOfMeasure;

  @ApiPropertyOptional({ example: 10 })
  @Expose()
  productWarrantyYears?: number;

  @ApiPropertyOptional({ example: 25 })
  @Expose()
  performanceWarrantyYears?: number;

  @ApiProperty({
    enum: Object.values(ProductStatus),
    enumName: 'ProductStatus',
    example: ProductStatus.ACTIVE,
  })
  @Expose()
  status!: ProductStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;
}

export class ProductsListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  @Expose()
  @Type(() => ProductResponseDto)
  data!: ProductResponseDto[];

  @ApiProperty({ example: 100 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;
}
