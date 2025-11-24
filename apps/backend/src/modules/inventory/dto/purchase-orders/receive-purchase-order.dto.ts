import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for recording items received in a purchase order
 */
export class ReceiveItemDto {
  @ApiProperty({ example: 'uuid', description: 'Purchase order item ID' })
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @ApiProperty({ example: 100, description: 'Quantity received' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  quantityReceived!: number;

  @ApiProperty({ example: 5, description: 'Quantity rejected/damaged', required: false })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  quantityRejected?: number;

  @ApiProperty({ example: 'Some items were damaged', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for receiving a purchase order
 */
export class ReceivePurchaseOrderDto {
  @ApiProperty({
    type: [ReceiveItemDto],
    description: 'Items received',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items!: ReceiveItemDto[];

  @ApiProperty({ example: '2024-01-15', description: 'Receiving date' })
  @IsDateString()
  @IsNotEmpty()
  receivingDate!: string;

  @ApiProperty({ example: 'GRN-001', description: 'Goods receipt note number', required: false })
  @IsString()
  @IsOptional()
  grnNumber?: string;

  @ApiProperty({ example: 'All items inspected and verified', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
