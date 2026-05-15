import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_PRICE = 100_000_000;
const MAX_LINE_TOTAL = 1_000_000_000_000;
const MAX_TAX_RATE = 100;

/**
 * DTO for creating a purchase order item
 */
export class CreatePurchaseOrderItemDto {
  // ==================== Product ID ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  // ==================== Quantity ====================

  @ApiProperty({ example: 100, description: 'Ordered quantity' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Max(MAX_QUANTITY, { message: `orderedQuantity must not exceed ${MAX_QUANTITY}` })
  @Type(() => Number)
  orderedQuantity!: number;

  // ==================== Pricing ====================

  @ApiProperty({ example: 1000.0, description: 'Unit price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Max(MAX_UNIT_PRICE, { message: `unitPrice must not exceed ${MAX_UNIT_PRICE}` })
  @Type(() => Number)
  unitPrice!: number;

  @ApiProperty({ example: 18.0, description: 'Tax rate (%)', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(MAX_TAX_RATE, { message: `taxRate must not exceed ${MAX_TAX_RATE}` })
  @Type(() => Number)
  taxRate?: number;

  @ApiProperty({ example: 100000.0, description: 'Line total' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Max(MAX_LINE_TOTAL, { message: `lineTotal must not exceed ${MAX_LINE_TOTAL}` })
  @Type(() => Number)
  lineTotal!: number;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Premium quality panels', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  /**
   * Audit flag: 'suggested' when the unit price came from the catalog
   * (PricingService prefill) and was not edited; 'manual_override' when the
   * buyer typed/edited the price (or no catalog price existed). Optional --
   * external API clients without this concept simply omit it (NULL stored).
   */
  @ApiPropertyOptional({
    enum: ['suggested', 'manual_override'],
    description: 'Whether unitPrice was suggested by the catalog or manually overridden.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['suggested', 'manual_override'])
  unitPriceSource?: 'suggested' | 'manual_override';
}
