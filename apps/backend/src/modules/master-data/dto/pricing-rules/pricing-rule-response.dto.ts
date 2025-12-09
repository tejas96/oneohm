import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PricingRuleType, ProductType, ProjectType, PricingRuleFormula } from '@oneohm-epc/shared-types';

/**
 * DTO for pricing rule response
 */
export class PricingRuleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ example: 'Adani PERC DCR - Residential Price' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'ADANI-PERC-DCR-RES' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: 'Base price for Adani PERC DCR panels' })
  @Expose()
  description?: string;

  @ApiProperty({ enum: PricingRuleType, example: PricingRuleType.BASE_PRICE })
  @Expose()
  ruleType!: PricingRuleType;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  productId?: string;

  @ApiPropertyOptional({ enum: ProductType, example: ProductType.SOLAR_PANEL })
  @Expose()
  productType?: ProductType;

  @ApiPropertyOptional({ enum: ProjectType, example: ProjectType.RESIDENTIAL })
  @Expose()
  projectType?: ProjectType;

  @ApiProperty({
    example: { pricePerWatt: 25.75, gstRate: 5, currency: 'INR' },
    description: 'Pricing formula configuration',
  })
  @Expose()
  formula!: PricingRuleFormula;

  @ApiProperty({ example: '2024-01-01' })
  @Expose()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @Expose()
  effectiveTo?: Date;

  @ApiProperty({ example: 10 })
  @Expose()
  priority!: number;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt!: Date;
}

/**
 * DTO for paginated pricing rules response
 */
export class PricingRulesListResponseDto {
  @ApiProperty({ type: [PricingRuleResponseDto] })
  @Expose()
  @Type(() => PricingRuleResponseDto)
  data!: PricingRuleResponseDto[];

  @ApiProperty({ example: 50 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;
}

