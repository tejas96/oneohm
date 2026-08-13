import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  NotEquals,
  ValidateNested,
} from 'class-validator';

/**
 * Every amount on the wire is **integer paise**, never rupees.
 *
 * A decimal rupee value would have to be re-rounded server-side, and rounding
 * money at an API boundary is how ₹0.01 discrepancies get born. The client
 * multiplies by 100 once, at the input field.
 */
export class AllocationInputDto {
  @ApiProperty({ description: 'Milestone this portion pays' })
  @IsUUID()
  milestoneId!: string;

  @ApiProperty({ description: 'Portion of the receipt allocated here, in paise', example: 1444442 })
  @IsInt()
  @IsPositive()
  amountPaise!: number;
}

/**
 * Proof of payment — a cheque photo, UPI screenshot or bank slip.
 *
 * Uploaded first via `POST /storage/presigned-url`, then referenced here by its
 * storage key. Optional by design: a receipt without proof is allowed but
 * visibly flagged, because blocking the record would just push staff back to
 * recording payments outside the system.
 */
export class ProofDocumentDto {
  @ApiProperty({ description: 'Storage key from the presigned upload (NOT a URL)' })
  @IsString()
  @MaxLength(500)
  fileKey!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  fileSize?: number;
}

export class RecordReceiptDto {
  @ApiProperty({ description: 'Amount received, in paise', example: 13000000 })
  @IsInt()
  @IsPositive()
  amountPaise!: number;

  @ApiPropertyOptional({
    description:
      'The date the money actually moved (IST). Defaults to today. Cannot be in the future.',
    example: '2026-07-15',
  })
  @IsDateString()
  @IsOptional()
  valueDate?: string;

  @ApiPropertyOptional({
    example: 'upi',
    description: 'upi | neft | rtgs | imps | cheque | cash | dd',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'UTR, cheque number, or other bank reference' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Customer this receipt came from' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    type: [AllocationInputDto],
    description:
      'Optional override. Omit and the receipt fills milestones in order, spilling over — ' +
      'which is almost always what you want. Supply only when finance knows better. ' +
      'Any amount not allocated becomes project credit.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  @IsOptional()
  allocations?: AllocationInputDto[];

  @ApiPropertyOptional({
    type: ProofDocumentDto,
    description: 'Cheque image, UPI screenshot, bank slip',
  })
  @ValidateNested()
  @Type(() => ProofDocumentDto)
  @IsOptional()
  proofDocument?: ProofDocumentDto;

  /**
   * Several images for one payment is ordinary — a cheque photo plus the bank
   * slip. `proofDocument` above is the older single-file form; both are
   * accepted and merged.
   */
  @ApiPropertyOptional({ type: [ProofDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProofDocumentDto)
  @IsOptional()
  proofDocuments?: ProofDocumentDto[];
}

export class RecordExpenseDto {
  @ApiProperty({ description: 'Amount spent, in paise', example: 8000000 })
  @IsInt()
  @IsPositive()
  amountPaise!: number;

  @ApiPropertyOptional({ description: 'The date the money left (IST). Defaults to today.' })
  @IsDateString()
  @IsOptional()
  valueDate?: string;

  @ApiProperty({ example: 'materials' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @NotEquals('other', { message: 'Please specify a category' })
  category!: string;

  @ApiPropertyOptional({ description: 'Who was paid' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  payee?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: ProofDocumentDto, description: 'Vendor bill or receipt' })
  @ValidateNested()
  @Type(() => ProofDocumentDto)
  @IsOptional()
  proofDocument?: ProofDocumentDto;

  @ApiPropertyOptional({ type: [ProofDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProofDocumentDto)
  @IsOptional()
  proofDocuments?: ProofDocumentDto[];
}

export class ReverseEntryDto {
  @ApiProperty({
    description: 'Why this entry is being reversed — a bounced cheque, a wrong amount, etc.',
    example: 'Cheque returned unpaid by bank',
  })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ChangeOrderDto {
  @ApiProperty({
    description: 'What the customer agreed to pay extra for. Free text — not limited to BOM items.',
    example: '2 additional panels + extended cable run',
  })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Additional amount, in paise', example: 3000000 })
  @IsInt()
  @IsPositive()
  amountPaise!: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class WaiveMilestoneDto {
  @ApiProperty({ example: 'Residual balance written off by agreement' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}
