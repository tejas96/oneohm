import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductType, UnitOfMeasure } from '@oneohm-epc/shared-types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Common specifications DTO
 */
export class CommonSpecificationsDto {
  @ApiPropertyOptional({ example: 550, description: 'Wattage in W' })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  wattage?: number;

  @ApiPropertyOptional({ example: 5, description: 'Capacity in kW/kWh' })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  capacity?: number;

  @ApiPropertyOptional({ example: '230V AC', description: 'Voltage specification' })
  @IsString()
  @IsOptional()
  voltage?: string;

  @ApiPropertyOptional({ example: 21.5, description: 'Efficiency percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  efficiency?: number;

  @ApiPropertyOptional({ example: '2278x1134x35mm', description: 'Product dimensions' })
  @IsString()
  @IsOptional()
  dimensions?: string;

  @ApiPropertyOptional({ example: 27.5, description: 'Weight in kg' })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  weight?: number;

  @ApiPropertyOptional({ example: '350-850V DC', description: 'Input voltage range' })
  @IsString()
  @IsOptional()
  inputVoltage?: string;

  @ApiPropertyOptional({ example: '230V AC', description: 'Output voltage' })
  @IsString()
  @IsOptional()
  outputVoltage?: string;

  @ApiPropertyOptional({ example: 3, description: 'Number of phases' })
  @IsInt()
  @IsOptional()
  @Min(1)
  phases?: number;

  @ApiPropertyOptional({ example: 2, description: 'MPPT channels count' })
  @IsInt()
  @IsOptional()
  @Min(1)
  mpptChannels?: number;

  @ApiPropertyOptional({ example: 'Monocrystalline', description: 'Solar cell type' })
  @IsString()
  @IsOptional()
  cellType?: string;

  @ApiPropertyOptional({ example: 'Lithium-ion', description: 'Battery chemistry' })
  @IsString()
  @IsOptional()
  chemistry?: string;

  @ApiPropertyOptional({ example: 6000, description: 'Battery cycle life' })
  @IsInt()
  @IsOptional()
  @Min(0)
  cycleLife?: number;

  @ApiPropertyOptional({ example: 90, description: 'Depth of discharge percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  depthOfDischarge?: number;
}

/**
 * Full specifications DTO (Hybrid)
 */
export class ProductSpecificationsDto {
  @ApiPropertyOptional({ type: CommonSpecificationsDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CommonSpecificationsDto)
  common?: CommonSpecificationsDto;

  @ApiPropertyOptional({
    example: { customField1: 'value1', customField2: 'value2' },
    description: 'Additional flexible specifications',
  })
  @IsObject()
  @IsOptional()
  additional?: Record<string, unknown>;
}

/**
 * DTO for creating a new product
 */
export class CreateProductDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Product category ID',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

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

  @ApiProperty({
    enum: ProductType,
    example: ProductType.SOLAR_PANEL,
    description: 'Product type',
  })
  @IsEnum(ProductType)
  @IsNotEmpty()
  type!: ProductType;

  @ApiPropertyOptional({ type: ProductSpecificationsDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSpecificationsDto)
  specifications?: ProductSpecificationsDto;

  @ApiPropertyOptional({ example: 'Jinko Solar', description: 'Brand name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'Jinko Solar Co. Ltd', description: 'Manufacturer name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'JKM550M-7RL4-V', description: 'Model number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  modelNumber?: string;

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
