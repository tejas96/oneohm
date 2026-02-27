import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemCategory } from '@oneohm-epc/shared-types';
import { Expose, Transform } from 'class-transformer';

import { toNum } from '../../../../common/utils';

/**
 * Quote Line Item Response DTO
 * Serialized response for individual line items within a quote version.
 */
export class QuoteLineItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  quoteVersionId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  productId?: string;

  @ApiProperty({ enum: Object.values(ItemCategory), example: ItemCategory.SOLAR_PANELS })
  @Expose()
  itemCategory!: ItemCategory;

  @ApiProperty({ example: 'Waaree 545W Mono PERC' })
  @Expose()
  itemName!: string;

  @ApiPropertyOptional({ example: 'High-efficiency monocrystalline panel' })
  @Expose()
  itemDescription?: string;

  @ApiPropertyOptional({ description: 'Product specifications (wattage, capacity, etc.)' })
  @Expose()
  specifications?: Record<string, unknown>;

  @ApiProperty({ example: 10 })
  @Expose()
  quantity!: number;

  @ApiPropertyOptional({ example: 'pcs' })
  @Expose()
  unitOfMeasure?: string;

  @ApiProperty({ example: 15000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  unitPrice!: number;

  @ApiProperty({ example: 150000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  lineTotal!: number;

  @ApiPropertyOptional({ example: 12.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  taxRate?: number;

  @ApiPropertyOptional({ example: 18000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  taxAmount?: number;

  @ApiProperty({ example: 0 })
  @Expose()
  displayOrder!: number;
}
