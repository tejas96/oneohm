import { ApiPropertyOptional } from '@nestjs/swagger';
import { PricingRuleType, ProductType, ProjectType } from '@oneohm-epc/shared-types';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating a pricing rule
 */
export class UpdatePricingRuleDto {
  @ApiPropertyOptional({ example: 'Adani PERC DCR - Residential Price', description: 'Rule name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: PricingRuleType,
    example: PricingRuleType.BASE_PRICE,
    description: 'Type of pricing rule',
  })
  @IsEnum(PricingRuleType)
  @IsOptional()
  ruleType?: PricingRuleType;

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

  @ApiPropertyOptional({
    example: { pricePerWatt: 26.0, gstRate: 5, currency: 'INR' },
    description: 'Pricing formula configuration',
  })
  @IsObject()
  @IsOptional()
  formula?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Effective from date' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Effective to date' })
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
