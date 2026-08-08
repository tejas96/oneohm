import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory, PaymentMethod, PaymentTransactionStatus } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Optional proof-document attachment passed alongside a receipt. The file
 * itself is uploaded separately via the storage module; the body here just
 * carries the resulting key + display metadata so the receipt service can
 * persist a `documents` row inside the same transaction.
 */
export class ReceiptProofDocumentDto {
  @ApiProperty({
    description: 'Storage key returned by uploadFile (NOT a full URL).',
    example: 'organizations/abc/receipts/2026/proof-xyz.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Document category — defaults to IMAGE for image MIME types, DOCUMENT otherwise.',
    enum: DocumentCategory,
  })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;
}

/**
 * Create a receipt against a project (plan §3.2). Customer is auto-filled
 * from the project's quote when not supplied. Payment term is optional —
 * advance / unallocated receipts are stored as `payment_term_id = NULL`.
 *
 * Internally this hits the same `payments` table as the legacy
 * CreatePaymentDto, but goes through the receipts code path which
 * generates an `RCP-{FY}-{6digit}` number, runs term re-aggregation under
 * a FOR UPDATE lock, and links any proof document in the same DB
 * transaction.
 */
export class CreateReceiptDto {
  @ApiProperty({ description: 'Project the receipt belongs to' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({
    description: 'Planned payment term being fulfilled. Omit for advances / unallocated receipts.',
  })
  @IsUUID()
  @IsOptional()
  paymentTermId?: string;

  @ApiPropertyOptional({
    description:
      "Override the auto-filled customer (defaults to the project's quote customer). Must be an active employee.",
  })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Amount actually received (must be > 0)', example: 25000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  paidAmount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Reference identifier — UTR for NEFT/RTGS, UPI transaction ID, cheque number, etc.',
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Bank name (cheque/NEFT)' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiPropertyOptional({
    description: 'Date of receipt (ISO date or datetime). Cannot be in the future.',
  })
  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @ApiPropertyOptional({
    description:
      'Initial status. Defaults to RECEIVED so the receipt counts toward term aggregation immediately.',
    enum: PaymentTransactionStatus,
  })
  @IsEnum(PaymentTransactionStatus)
  @IsOptional()
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: () => ReceiptProofDocumentDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ReceiptProofDocumentDto)
  @IsOptional()
  proofDocument?: ReceiptProofDocumentDto;
}
