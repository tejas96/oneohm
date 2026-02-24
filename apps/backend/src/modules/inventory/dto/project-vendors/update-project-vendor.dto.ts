import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating a project-vendor association
 * All fields are optional
 */
export class UpdateProjectVendorDto {
  // ==================== Vendor Role ====================

  @ApiProperty({ example: 'Installation Contractor', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  vendorRole?: string;

  // ==================== Contract Details ====================

  @ApiProperty({ example: 250000.0, required: false })
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

  // ==================== Notes ====================

  @ApiProperty({ example: 'Specialized in residential solar installations', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
