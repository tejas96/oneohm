import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for fulfilling a stock allocation
 */
export class FulfillStockAllocationDto {
  @ApiProperty({ example: 50, description: 'Quantity to fulfill' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  fulfilledQuantity!: number;

  @ApiProperty({ example: '2024-01-15', description: 'Fulfillment date' })
  @IsDateString()
  @IsNotEmpty()
  fulfillmentDate!: string;

  @ApiProperty({ example: 'Partially fulfilled based on available stock', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

