import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * DTO for property document validation
 * Used in CreateCustomerPropertyDto and UpdateCustomerPropertyDto
 *
 * Matches PropertyDocument interface from @tejas96/shared/types
 * Unified storage for all documents (loan and non-loan)
 */
export class PropertyDocumentDto {
  @ApiProperty({
    example: 'https://storage.example.com/docs/aadhaar.jpg',
    description: 'Cloud storage URL of the document',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  url!: string;

  @ApiProperty({
    example: 'aadhaar_card',
    description: 'Document type/category tag (e.g., aadhaar_card, pan_card, other)',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  tag!: string;

  @ApiProperty({
    example: 'aadhaar.jpg',
    description: 'Original filename',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  fileName!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this document is used for loan application',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose()
  isLoanDoc?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Verification status of the document',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00.000Z',
    description: 'ISO timestamp when document was verified',
  })
  @IsOptional()
  @IsDateString()
  @Expose()
  verifiedAt?: string;

  @ApiPropertyOptional({
    example: '1e97ba4e-d95e-43d2-95f4-5ad4f50adf8f',
    description: 'User UUID who verified the document',
  })
  @IsOptional()
  @IsUUID()
  @Expose()
  verifiedBy?: string;

  @ApiPropertyOptional({
    example: 245000,
    description: 'File size in bytes',
  })
  @IsOptional()
  @IsNumber()
  @Expose()
  fileSize?: number;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00.000Z',
    description: 'ISO timestamp when document was uploaded',
  })
  @IsOptional()
  @IsDateString()
  @Expose()
  uploadedAt?: string;
}
