import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * One itemization line on a CreateExpense / UpdateExpense payload.
 *
 * Validation rule: exactly one identifier path must be filled —
 *   `productId`  → catalog/BOM-keyed line, OR
 *   `itemName`   → off-list item.
 * Enforced via ValidateIf so error messages are precise on either side.
 */
export class ExpenseProductLinkDto {
  @ApiPropertyOptional({
    description: 'Catalog product id. Omit for an off-list item.',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Free-text item name. Required when productId is omitted.',
  })
  @ValidateIf((o: ExpenseProductLinkDto) => !o.productId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName?: string;

  @ApiPropertyOptional({
    description: 'Free-text unit (e.g. "tube", "box"). Optional for off-list items.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Quantity (must be > 0)', minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Per-unit price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
