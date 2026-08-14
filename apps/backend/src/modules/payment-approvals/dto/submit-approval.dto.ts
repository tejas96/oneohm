import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { AllocationInputDto, ProofDocumentDto } from '../../ledger/dto';
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

  /**
   * Receipts only. Omit to let the waterfall fill milestones in order.
   *
   * Validated against live balances at APPROVAL, not here — the schedule can be
   * repriced while a payment sits in the queue, so a split that was valid at
   * submission may not be valid when it is approved.
   */
  @ApiPropertyOptional({ type: [AllocationInputDto] })
  @ValidateIf((o: SubmitApprovalDto) => o.kind === 'receipt')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  @IsOptional()
  allocations?: AllocationInputDto[];

  @ApiPropertyOptional({ description: 'Customer this receipt came from' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  /**
   * The customer's own evidence, already uploaded via the presigned URL. Filed
   * at submission rather than at approval — an approver who cannot see the proof
   * has nothing to verify against, which would defeat the point of the queue.
   */
  @ApiPropertyOptional({
    type: [ProofDocumentDto],
    description: 'Cheque images, UPI screenshots, bank slips. Several are normal for one payment.',
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ProofDocumentDto)
  @IsOptional()
  proofDocuments?: ProofDocumentDto[];

  // There is deliberately no `proofDocumentId`. Accepting an arbitrary document
  // id would let a caller name any document in the system — including one on
  // another customer's property — and approval re-points that document at the
  // new ledger entry, silently detaching it from where it belonged. Proof is
  // always supplied as `proofDocuments` above, which creates fresh rows.

  @ApiPropertyOptional({ description: 'Required for reversal — the ledger entry being reversed.' })
  @ValidateIf((o: SubmitApprovalDto) => o.kind === 'reversal')
  @IsUUID()
  reversesEntryId?: string;

  @ApiPropertyOptional({
    description: 'Required for reversal. An unexplained reversal is not an audit trail.',
  })
  @ValidateIf((o: SubmitApprovalDto) => o.kind === 'reversal')
  @IsString()
  @MaxLength(500)
  reversalReason?: string;
}
