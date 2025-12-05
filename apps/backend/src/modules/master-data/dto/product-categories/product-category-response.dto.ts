import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * DTO for product category response
 */
export class ProductCategoryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: 'Solar Panels' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'SOLAR_PANELS' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'All types of solar photovoltaic panels' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  parentCategoryId?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({
    type: () => ProductCategoryResponseDto,
    isArray: true,
  })
  @Expose()
  @Type(() => ProductCategoryResponseDto)
  childCategories?: ProductCategoryResponseDto[];
}
