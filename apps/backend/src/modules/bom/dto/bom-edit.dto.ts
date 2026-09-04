import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

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
