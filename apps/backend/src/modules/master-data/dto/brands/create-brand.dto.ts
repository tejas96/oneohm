import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Jinko Solar', description: 'Brand name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'JinkoSolar Holding', description: 'Manufacturer name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  manufacturerName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'support@example.com' })
  @IsString()
  @IsOptional()
  supportContact?: string;

  @ApiPropertyOptional({ example: 'Preferred inverter brand' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Allowed product types for this brand',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productTypeIds?: string[];
}
