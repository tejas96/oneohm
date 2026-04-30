import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateMaterialDispatchItemDto } from './create-material-dispatch-item.dto';

/**
 * DTO for creating a material dispatch
 */
export class CreateMaterialDispatchDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  // ==================== Dispatch Info ====================

  @ApiProperty({ example: '2024-01-15', description: 'Dispatch date', required: false })
  @IsDateString()
  @IsOptional()
  dispatchDate?: string;

  // ==================== Delivery ====================

  @ApiProperty({ example: '2024-01-20', required: false })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  // ==================== Transport ====================

  @ApiProperty({ example: 'MH-01-AB-1234', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  vehicleNumber?: string;

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  driverName?: string;

  @ApiProperty({ example: '+91-9876543210', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  driverPhone?: string;

  @ApiProperty({ example: 'ABC Transport Company', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  transportCompany?: string;

  // Note: status is NOT accepted from clients — service forces PREPARED on create.

  // ==================== Items ====================

  @ApiProperty({
    type: [CreateMaterialDispatchItemDto],
    description: 'Dispatch line items',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialDispatchItemDto)
  items!: CreateMaterialDispatchItemDto[];

  // ==================== Notes ====================

  @ApiProperty({ example: 'Handle with care', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
