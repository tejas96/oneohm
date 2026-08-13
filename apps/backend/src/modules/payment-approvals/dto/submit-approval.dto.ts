import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import type { PendingKind } from '../entities';

/**
 * Submitting money for verification.
 *
 * Amounts are **integer paise**, always positive on the wire — the service
 * applies the ledger's sign convention (money out negative). A reversal takes
 * neither project nor amount: both are read from the entry being reversed, so
 * a reversal cannot silently reverse a different figure than the original.
 */
export class SubmitApprovalDto {
  @ApiProperty({ enum: ['receipt', 'expense', 'reversal'] })
  @IsIn(['receipt', 'expense', 'reversal'])
  kind!: PendingKind;

  @ApiPropertyOptional({ description: 'Required for receipt and expense.' })
  @ValidateIf((o: SubmitApprovalDto) => o.kind !== 'reversal')
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Positive integer paise. Required for receipt and expense.',
    example: 5000000,
  })
  @ValidateIf((o: SubmitApprovalDto) => o.kind !== 'reversal')
  @IsInt()
  @IsPositive()
  amountPaise?: number;

  @ApiPropertyOptional({
    description: 'The date the money actually moved (IST). Defaults to today. Never the future.',
    example: '2026-08-01',
  })
  @IsDateString()
  @IsOptional()
  valueDate?: string;

  @ApiPropertyOptional({ example: 'upi', description: 'upi | neft | rtgs | imps | cheque | cash | dd' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'UTR, cheque number, or other bank reference' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({ description: 'Payee for an expense; payer for a receipt' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  counterparty?: string;

  @ApiPropertyOptional({ description: 'Required for expense.' })
  @ValidateIf((o: SubmitApprovalDto) => o.kind === 'expense')
  @IsString()
  @MaxLength(30)
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Customer this receipt came from' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: "The customer's own proof of payment, already uploaded" })
  @IsUUID()
  @IsOptional()
  proofDocumentId?: string;

  @ApiPropertyOptional({ description: 'Required for reversal — the ledger entry being reversed.' })
  @ValidateIf((o: SubmitApprovalDto) => o.kind === 'reversal')
  @IsUUID()
  reversesEntryId?: string;

  @ApiPropertyOptional({ description: 'Required for reversal. An unexplained reversal is not an audit trail.' })
  @ValidateIf((o: SubmitApprovalDto) => o.kind === 'reversal')
  @IsString()
  @MaxLength(500)
  reversalReason?: string;
}
