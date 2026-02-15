// ============================================
// IMPORTS
// ============================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, DocumentType, WcrType } from '@oneohm-epc/shared-types';
import {
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
 * Create Document DTO
 */
export class CreateDocumentDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ description: 'Document name', example: 'Installation Contract' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  documentName!: string;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
    example: DocumentType.CONTRACT,
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType!: DocumentType;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Quote ID' })
  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @ApiPropertyOptional({ description: 'Payment ID' })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiProperty({ description: 'File path/URL', example: '/documents/2024/contract-123.pdf' })
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @ApiProperty({ description: 'File name', example: 'contract-123.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 1024000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Parent document ID for versioning' })
  @IsOptional()
  @IsUUID()
  parentDocumentId?: string;

  @ApiPropertyOptional({ description: 'WCR session number', example: 'WCR-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wcrSessionNumber?: string;

  @ApiPropertyOptional({
    description: 'WCR type',
    enum: WcrType,
    example: WcrType.PRELIMINARY,
  })
  @IsOptional()
  @IsEnum(WcrType)
  wcrType?: WcrType;

  @ApiPropertyOptional({
    description: 'Document status',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { tags: ['important'] } })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Sign Document DTO
 */
export class SignDocumentDto {
  @ApiProperty({ description: 'Signature data (base64 or JSON)' })
  @IsString()
  @IsNotEmpty()
  signatureData!: string;

  @ApiPropertyOptional({ description: 'OTP for verification' })
  @IsOptional()
  @IsString()
  otp?: string;
}

/**
 * Verify Document OTP DTO
 */
export class VerifyDocumentOtpDto {
  @ApiProperty({ description: 'OTP code' })
  @IsString()
  @IsNotEmpty()
  otp!: string;
}

/**
 * Update Document Status DTO
 */
export class UpdateDocumentStatusDto {
  @ApiProperty({
    description: 'New document status',
    enum: DocumentStatus,
  })
  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  status!: DocumentStatus;

  @ApiPropertyOptional({ description: 'Status change notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Create Document Version DTO
 */
export class CreateDocumentVersionDto {
  @ApiProperty({ description: 'Parent document ID' })
  @IsUUID()
  @IsNotEmpty()
  parentDocumentId!: string;

  @ApiProperty({ description: 'Document name', example: 'Contract v2.0' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  documentName!: string;

  @ApiProperty({ description: 'File path/URL' })
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Version notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
