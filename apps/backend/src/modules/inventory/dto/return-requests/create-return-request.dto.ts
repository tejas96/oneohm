import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateReturnRequestDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Stock allocation ID',
  })
  @IsUUID()
  @IsNotEmpty()
  allocationId!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    description:
      'BOM ID. Optional: a project can have no BOM, and the material still has ' +
      'to be recovered. Completing a return resolves the allocation, not the BOM.',
  })
  @IsOptional()
  @IsUUID()
  bomId?: string;

  @ApiProperty({ example: 2, description: 'Quantity to return' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 'Excess units dispatched — site survey reduced requirement' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
