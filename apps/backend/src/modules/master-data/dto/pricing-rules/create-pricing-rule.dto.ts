import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingRuleType, ProductType, ProjectType } from '@oneohm-epc/shared-types';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new pricing rule
 */
export class CreatePricingRuleDto {
  @ApiProperty({ example: 'Adani PERC DCR - Residential Price', description: 'Rule name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'ADANI-PERC-DCR-RES', description: 'Unique rule code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({ example: 'Base price for Adani PERC DCR panels' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: PricingRuleType,
    example: PricingRuleType.BASE_PRICE,
    description: 'Type of pricing rule',
  })
  @IsEnum(PricingRuleType)
  ruleType!: PricingRuleType;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Product ID this rule applies to',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    enum: ProductType,
    example: ProductType.SOLAR_PANEL,
    description: 'Product type this rule applies to',
  })
  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @ApiPropertyOptional({
    enum: ProjectType,
    example: ProjectType.RESIDENTIAL,
    description: 'Project type this rule applies to',
  })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @ApiProperty({
    example: { pricePerWatt: 25.75, gstRate: 5, currency: 'INR' },
    description: 'Pricing formula configuration',
  })
  @IsObject()
  @IsNotEmpty()
  formula!: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01', description: 'Effective from date' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Effective to date (null = no end)' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 10, description: 'Priority (higher wins)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: true, description: 'Is rule active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
