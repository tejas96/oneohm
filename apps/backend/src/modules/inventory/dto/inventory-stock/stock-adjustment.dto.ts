import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for adjusting stock (manual correction)
 */
export class StockAdjustmentDto {
  @ApiProperty({ example: 'uuid', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @ApiProperty({ example: 'uuid', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 150, description: 'New correct quantity' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  newQuantity!: number;

  @ApiProperty({ example: 'Physical count adjustment', description: 'Reason for adjustment' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
