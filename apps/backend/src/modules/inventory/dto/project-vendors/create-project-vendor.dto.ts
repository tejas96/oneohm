import { ApiProperty } from '@nestjs/swagger';
import { ProjectVendorStatus } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a project-vendor association
 */
export class CreateProjectVendorDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Vendor ID' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  // ==================== Vendor Role ====================

  @ApiProperty({ example: 'Installation Contractor', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  vendorRole?: string;

  // ==================== Contract Details ====================

  @ApiProperty({ example: 250000.0, description: 'Contract value', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  contractValue?: number;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @ApiProperty({ example: '2024-06-15', required: false })
  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @ApiProperty({ example: 'INR', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(ProjectVendorStatus),
    enumName: 'ProjectVendorStatus',
    example: ProjectVendorStatus.ACTIVE,
    default: ProjectVendorStatus.ACTIVE,
  })
  @IsEnum(ProjectVendorStatus)
  @IsOptional()
  status?: ProjectVendorStatus;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Specialized in residential solar installations', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
