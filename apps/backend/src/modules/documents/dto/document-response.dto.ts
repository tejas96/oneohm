// ============================================
// IMPORTS
// ============================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, DocumentType, WcrType } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

/**
 * User Response DTO (Minimal)
 */
export class DocumentUserResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  firstName!: string;

  @ApiProperty()
  @Expose()
  lastName!: string;

  @ApiProperty()
  @Expose()
  email!: string;
}

/**
 * Document Response DTO
 */
export class DocumentResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  @ApiProperty()
  @Expose()
  documentNumber!: string;

  @ApiProperty()
  @Expose()
  documentName!: string;

  @ApiProperty({ enum: DocumentType })
  @Expose()
  documentType!: DocumentType;

  @ApiPropertyOptional()
  @Expose()
  projectId?: string;

  @ApiPropertyOptional()
  @Expose()
  customerId?: string;

  @ApiPropertyOptional()
  @Expose()
  quoteId?: string;

  @ApiPropertyOptional()
  @Expose()
  paymentId?: string;

  @ApiProperty()
  @Expose()
  filePath!: string;

  @ApiProperty()
  @Expose()
  fileName!: string;

  @ApiPropertyOptional()
  @Expose()
  fileSizeBytes?: number;

  @ApiPropertyOptional()
  @Expose()
  mimeType?: string;

  @ApiProperty()
  @Expose()
  version!: number;

  @ApiProperty()
  @Expose()
  isLatestVersion!: boolean;

  @ApiPropertyOptional()
  @Expose()
  parentDocumentId?: string;

  @ApiPropertyOptional()
  @Expose()
  wcrSessionNumber?: string;

  @ApiPropertyOptional({ enum: WcrType })
  @Expose()
  wcrType?: WcrType;

  @ApiProperty()
  @Expose()
  isSigned!: boolean;

  @ApiPropertyOptional()
  @Expose()
  signedBy?: string;

  @ApiPropertyOptional()
  @Expose()
  signedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  signatureData?: string;

  @ApiProperty()
  @Expose()
  isOtpVerified!: boolean;

  @ApiPropertyOptional()
  @Expose()
  otpVerifiedAt?: Date;

  @ApiProperty({ enum: DocumentStatus })
  @Expose()
  status!: DocumentStatus;

  @ApiPropertyOptional()
  @Expose()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Expose()
  notes?: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  deletedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;

  // ============================================
  // RELATIONS
  // ============================================
  @ApiPropertyOptional({ type: DocumentUserResponseDto })
  @Expose()
  @Type(() => DocumentUserResponseDto)
  createdByUser?: DocumentUserResponseDto;

  @ApiPropertyOptional({ type: DocumentUserResponseDto })
  @Expose()
  @Type(() => DocumentUserResponseDto)
  updatedByUser?: DocumentUserResponseDto;

  @ApiPropertyOptional({ type: DocumentUserResponseDto })
  @Expose()
  @Type(() => DocumentUserResponseDto)
  signedByUser?: DocumentUserResponseDto;

  @ApiPropertyOptional({ type: () => DocumentResponseDto })
  @Expose()
  @Type(() => DocumentResponseDto)
  parentDocument?: DocumentResponseDto;
}

/**
 * Document Version Response DTO (Lightweight)
 */
export class DocumentVersionResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  documentNumber!: string;

  @ApiProperty()
  @Expose()
  documentName!: string;

  @ApiProperty()
  @Expose()
  version!: number;

  @ApiProperty()
  @Expose()
  isLatestVersion!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiPropertyOptional({ type: DocumentUserResponseDto })
  @Expose()
  @Type(() => DocumentUserResponseDto)
  createdByUser?: DocumentUserResponseDto;
}
