import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/**
 * DTO for creating a material dispatch item
 */
export class CreateMaterialDispatchItemDto {
  // ==================== Product ID ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  // ==================== Quantity ====================

  @ApiProperty({ example: 50, description: 'Dispatch quantity' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsNotEmpty()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  // ==================== Batch/Serial ====================

  @ApiProperty({ example: 'BATCH-2024-001', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  batchNumber?: string;

  @ApiProperty({
    example: ['SN-001', 'SN-002', 'SN-003'],
    description: 'Serial numbers',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  serialNumbers?: string[];

  // ==================== Notes ====================

  @ApiProperty({ example: 'Premium quality panels', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}



