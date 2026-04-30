import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator';

import {
  INVENTORY_SEARCH_TYPES,
  type InventorySearchType,
} from '../../services/inventory-search.service';

/**
 * Query for GET /inventory/search.
 *
 * - q: 2-100 chars; trimmed; required.
 * - types: optional comma-separated list; each value must be one of
 *   product, vendor, warehouse, purchase-order, dispatch. When omitted,
 *   the server queries all buckets.
 */
export class InventorySearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (2-100 characters)',
    example: 'solar',
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100)
  q!: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of buckets to query',
    example: 'product,vendor',
    enum: INVENTORY_SEARCH_TYPES as unknown as string[],
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  })
  @IsArray()
  @IsIn(INVENTORY_SEARCH_TYPES as unknown as string[], { each: true })
  types?: InventorySearchType[];
}
