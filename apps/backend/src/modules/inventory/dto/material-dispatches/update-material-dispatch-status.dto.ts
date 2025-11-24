import { ApiProperty } from '@nestjs/swagger';
import { MaterialDispatchStatus } from '@oneohm-epc/shared-types';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for updating material dispatch status
 */
export class UpdateMaterialDispatchStatusDto {
  @ApiProperty({
    enum: Object.values(MaterialDispatchStatus),
    enumName: 'MaterialDispatchStatus',
    description: 'New status for the dispatch',
  })
  @IsEnum(MaterialDispatchStatus)
  @IsNotEmpty()
  status!: MaterialDispatchStatus;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Dispatch date (for IN_TRANSIT status)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dispatchDate?: string;

  @ApiProperty({
    example: '2024-01-20',
    description: 'Actual delivery date (for DELIVERED status)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  actualDeliveryDate?: string;

  @ApiProperty({
    example: 'uuid',
    description: 'Received by user ID (for DELIVERED status)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  receivedById?: string;

  @ApiProperty({ example: 'Dispatch approved by manager', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
