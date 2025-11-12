import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for transferring stock between warehouses
 */
export class StockTransferDto {
  @ApiProperty({ example: 'uuid', description: 'Source warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  fromWarehouseId!: string;

  @ApiProperty({ example: 'uuid', description: 'Destination warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  toWarehouseId!: string;

  @ApiProperty({ example: 'uuid', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 50, description: 'Quantity to transfer' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 'Transfer for project XYZ', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

