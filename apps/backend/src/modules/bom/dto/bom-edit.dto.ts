import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/** Reason is mandatory on every edit — it is the "why" the change log exists to answer. */
class ReasonedEditDto {
  @ApiProperty({ example: 'Rocky soil, second earth pit needed' })
  @IsString()
  @MinLength(3, { message: 'Give a reason of at least 3 characters' })
  @MaxLength(500)
  reason!: string;
}

export class AddBomItemDto extends ReasonedEditDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  /**
   * Min(0.001), not Min(0): setting a quantity to zero is a REMOVAL and must
   * go through removeItem, so the log records change_type = 'remove' rather
   * than a 'quantity' change to zero. Those read very differently to a human.
   */
  @ApiProperty({ example: 2 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}

export class ChangeBomQuantityDto extends ReasonedEditDto {
  /** See AddBomItemDto.quantity — zero is removeItem's job, not this one's. */
  @ApiProperty({ example: 14 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}

export class ReplaceBomItemDto extends ReasonedEditDto {
  @ApiProperty()
  @IsUUID()
  replaceWithProductId!: string;
}

export class RemoveBomItemDto extends ReasonedEditDto {}

/**
 * The body of `PATCH /projects/:projectId/bom/items/:itemId`, which does two
 * jobs: change a line's quantity, or swap its product. Exactly one of the two
 * optional fields must be present — the controller rejects both and neither.
 *
 * ONE class, not `ChangeBomQuantityDto | ReplaceBomItemDto`. A union has no
 * runtime metatype, so `design:paramtypes` reports it as Object and the global
 * ValidationPipe skips the body entirely: no whitelisting, and — the part that
 * matters — no check that `reason` is present. The change log's guarantee is
 * that every mutation carries a reason, and a union body would have quietly
 * dropped that guarantee on this one route while the other two kept it.
 */
export class PatchBomItemDto extends ReasonedEditDto {
  /** See AddBomItemDto.quantity — zero is a removal, which is DELETE's job. */
  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Swap the line to this product, keeping the quantity' })
  @IsOptional()
  @IsUUID()
  replaceWithProductId?: string;
}
