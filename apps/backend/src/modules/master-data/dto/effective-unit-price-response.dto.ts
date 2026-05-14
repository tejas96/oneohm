import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

import { toNum, toNumNullable } from '../../../common/utils';

/**
 * Canonical pricing basis values stored on product_types.default_pricing_basis.
 * Source-of-truth strings observed in the DB:
 *   - per_unit   (inverters, cables, BOS items)
 *   - per_watt   (solar panels; base × wattage → ₹/piece)
 *   - per_kw     (mounting structures; base × multiplier × systemSizeKw → ₹/piece)
 */
export type PricingBasis = 'per_unit' | 'per_watt' | 'per_kw' | string;

export type EffectivePriceSource = 'product_prices' | 'none';

/**
 * Canonical ₹-per-piece price for any product, computed by PricingService.
 * `unitPricePerPiece` is null when no active price exists OR when a per_watt/
 * per_kw product is missing the input needed to convert (wattage / systemSizeKw).
 * In that case `source = 'none'` and callers fall back to manual entry.
 */
export class EffectiveUnitPriceResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  productId!: string;

  @ApiPropertyOptional({
    description:
      'Canonical per-piece price after applying basis + cost multiplier. Null when not resolvable.',
    example: 16104,
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => toNumNullable(value))
  unitPricePerPiece!: number | null;

  @ApiPropertyOptional({
    description:
      'Raw unit_price from product_prices (basis-native: ₹/W for per_watt, ₹/unit for per_unit, ₹/kW for per_kw).',
    example: 26.4,
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => toNumNullable(value))
  basePrice!: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Expose()
  @Transform(({ value }) => toNumNullable(value))
  costMultiplier!: number | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  @Expose()
  @Transform(({ value }) => toNum(value))
  gstRate?: number;

  @ApiProperty({ example: 'INR' })
  @Expose()
  currency!: string;

  @ApiProperty({ example: 'per_watt' })
  @Expose()
  basis!: PricingBasis;

  @ApiProperty({ enum: ['product_prices', 'none'], example: 'product_prices' })
  @Expose()
  source!: EffectivePriceSource;

  @ApiPropertyOptional({ example: '2024-01-01', nullable: true })
  @Expose()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional({ example: '2024-12-31', nullable: true })
  @Expose()
  effectiveTo?: Date | null;

  @ApiPropertyOptional({
    description: 'Wattage used to convert per_watt price (null for other bases).',
    example: 610,
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => toNumNullable(value))
  wattage?: number | null;

  @ApiPropertyOptional({
    description: 'System size in kW used to convert per_kw structure price (null for other bases).',
    example: 7,
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => toNumNullable(value))
  systemSizeKw?: number | null;
}
