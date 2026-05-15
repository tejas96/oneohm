import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

/**
 * DTO for returning dispatched stock back to the warehouse.
 */
export class ReturnStockAllocationDto {
  @ApiProperty({ example: 5, description: 'Quantity to return to stock' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 'Damaged on site', description: 'Reason for the return' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
