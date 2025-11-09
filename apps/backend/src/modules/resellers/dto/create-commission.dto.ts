import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CommissionStatus } from '@oneohm-epc/shared-types';
import { IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for creating a new commission record
 */
export class CreateCommissionDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Reseller ID',
  })
  @IsUUID()
  @IsNotEmpty()
  resellerId!: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Project ID (if applicable)',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    example: 500000.0,
    description: 'Total project value in INR',
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  @Min(0)
  projectValue!: number;

  @ApiProperty({
    example: 4.0,
    description: 'Commission percentage',
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  @Min(0)
  commissionPercentage!: number;

  @ApiProperty({
    example: 20000.0,
    description: 'Calculated commission amount',
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  @Min(0)
  commissionAmount!: number;

  @ApiPropertyOptional({
    example: 'Commission for Project XYZ',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    enum: Object.values(CommissionStatus),
    enumName: 'CommissionStatus',
    example: CommissionStatus.PENDING,
    description: 'Initial status (defaults to pending)',
  })
  @IsEnum(CommissionStatus)
  @IsOptional()
  status?: CommissionStatus;
}
