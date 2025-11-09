import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductType, UnitOfMeasure } from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';

/**
 * DTO for product response
 */
export class ProductResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  categoryId?: string;

  @ApiProperty({ example: 'Jinko Solar Tiger Neo 550W' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'JINKO-550W' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'High-efficiency monocrystalline solar panel' })
  @Expose()
  description?: string;

  @ApiProperty({ enum: ProductType, example: ProductType.SOLAR_PANEL })
  @Expose()
  type!: ProductType;

  @ApiPropertyOptional()
  @Expose()
  specifications?: unknown;

  @ApiPropertyOptional({ example: 'Jinko Solar' })
  @Expose()
  brand?: string;

  @ApiPropertyOptional({ example: 'Jinko Solar Co. Ltd' })
  @Expose()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'JKM550M-7RL4-V' })
  @Expose()
  modelNumber?: string;

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
