import { ApiProperty } from '@nestjs/swagger';
import { MaterialDispatchStatus } from '@oneohm-epc/shared-types';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating a material dispatch
 * All fields are optional
 */
export class UpdateMaterialDispatchDto {
  // ==================== Dispatch Info ====================

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  dispatchDate?: string;

  // ==================== Delivery ====================

  @ApiProperty({ example: '2024-01-20', required: false })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ example: '2024-01-19', required: false })
  @IsDateString()
  @IsOptional()
  actualDeliveryDate?: string;

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

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(MaterialDispatchStatus),
    enumName: 'MaterialDispatchStatus',
    example: MaterialDispatchStatus.DISPATCHED,
    required: false,
  })
  @IsEnum(MaterialDispatchStatus)
  @IsOptional()
  status?: MaterialDispatchStatus;

  // ==================== Delivery Confirmation ====================

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  deliveredBy?: string;

  @ApiProperty({ example: 'Site Manager - Amit Shah', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  receivedBy?: string;

  @ApiProperty({ example: 'base64-encoded-signature', required: false })
  @IsString()
  @IsOptional()
  receiverSignature?: string;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Delivered successfully', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}



