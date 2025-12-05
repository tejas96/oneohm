import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * DTO for creating a new product category
 */
export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Solar Panels', description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'SOLAR_PANELS', description: 'Unique category code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({
    example: 'All types of solar photovoltaic panels',
    description: 'Category description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Parent category ID for hierarchy (null for top-level)',
  })
  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;
}
