import { ApiProperty } from '@nestjs/swagger';
import {
  WarehouseStatus,
  WarehouseType,
  type WarehouseCoordinates,
} from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for creating a warehouse
 */
export class CreateWarehouseDto {
  // ==================== Basic Info ====================

  @ApiProperty({ example: 'Main Warehouse Mumbai', description: 'Warehouse name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'WH-MUM-001', description: 'Unique warehouse code' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code!: string;

  // ==================== Location ====================

  @ApiProperty({ example: '123 Industrial Area, Andheri East', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: '400069', required: false })
  @IsString()
  @IsOptional()
  @Length(6, 10)
  pincode?: string;

  @ApiProperty({
    example: { latitude: 19.1136, longitude: 72.8697 },
    description: 'GPS coordinates',
    required: false,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  coordinates?: WarehouseCoordinates;

  // ==================== Type ====================

  @ApiProperty({
    enum: Object.values(WarehouseType),
    enumName: 'WarehouseType',
    example: WarehouseType.OWN,
    default: WarehouseType.OWN,
  })
  @IsEnum(WarehouseType)
  @IsOptional()
  warehouseType?: WarehouseType;

  // ==================== Manager ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsUUID()
  @IsOptional()
  warehouseManagerId?: string;

  // ==================== Contact ====================

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @ApiProperty({ example: '+91-9876543210', required: false })
  @IsString()
  @IsOptional()
  @Length(10, 20)
  phone?: string;

  @ApiProperty({ example: 'warehouse@example.com', required: false })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(WarehouseStatus),
    enumName: 'WarehouseStatus',
    example: WarehouseStatus.ACTIVE,
    default: WarehouseStatus.ACTIVE,
  })
  @IsEnum(WarehouseStatus)
  @IsOptional()
  status?: WarehouseStatus;
}
