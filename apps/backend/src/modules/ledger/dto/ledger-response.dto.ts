import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

/**
 * Responses expose **paise** as the authoritative value, with a rupee field
 * alongside for display.
 *
 * Two numbers rather than one is deliberate: the client should never compute a
 * total by summing the rupee fields, because that reintroduces float error. The
 * paise value is what arithmetic is done on; the rupee value is what is printed.
 */
export class LedgerEntryResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ example: 'RCP-2026-27-000058' })
  @Expose()
  entryNo!: string;

  @ApiProperty({ enum: ['receipt', 'expense', 'refund', 'write_off'] })
  @Expose()
  entryType!: string;

  @ApiProperty({ enum: ['in', 'out'] })
  @Expose()
  direction!: string;

  @ApiProperty({ description: 'Signed integer paise. Negative rows are reversals or money out.' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  amountPaise!: number;

  @ApiProperty({ description: 'The date the money actually moved (IST)', example: '2026-07-15' })
  @Expose()
  valueDate!: string;

  @ApiProperty({
    description:
      'True only for historical rows whose real value date is unrecoverable, backfilled from created_at.',
  })
  @Expose()
  valueDateIsInferred!: boolean;

  @ApiPropertyOptional()
  @Expose()
  paymentMethod?: string | null;

  @ApiPropertyOptional({ description: 'UTR / cheque number' })
  @Expose()
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Vendor or payee, for money out' })
  @Expose()
  counterparty?: string | null;

  @ApiPropertyOptional()
  @Expose()
  category?: string | null;

  @ApiPropertyOptional()
  @Expose()
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Set when this entry reverses another' })
  @Expose()
  reversesId?: string | null;

  @ApiPropertyOptional()
  @Expose()
  reversalReason?: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  createdBy!: string;

  /**
   * Who recorded the payment, and who approved it into the ledger.
   *
   * Both are needed: `createdBy` above is the APPROVER, because approval is what
   * inserts the row — showing it alone would credit the wrong person with
   * recording the money. Null on entries that predate the approval queue.
   */
  @ApiPropertyOptional({ description: 'Who submitted this for approval' })
  @Expose()
  recordedByName?: string | null;

  @ApiPropertyOptional({ description: 'Who approved it into the ledger' })
  @Expose()
  approvedByName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  approvedAt?: Date | null;
}

/**
 * One entry's contribution to one milestone.
 *
 * `allocatedPaise` — not `entryAmountPaise` — is the number that belongs under a
 * milestone. They differ whenever a receipt spans more than one milestone, which
 * is the normal case for anything larger than the advance.
 */
export class MilestoneAllocationResponseDto {
  @ApiProperty()
  @Expose()
  allocationId!: string;

  @ApiProperty()
  @Expose()
  entryId!: string;

  @ApiProperty()
  @Expose()
  entryNo!: string;

  @ApiProperty({ enum: ['in', 'out'] })
  @Expose()
  direction!: string;

  @ApiProperty({ description: 'What this entry put against THIS milestone. Signed.' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  allocatedPaise!: number;

  @ApiProperty({ description: "The entry's own total — context only, never the milestone figure" })
  @Expose()
  @Transform(({ value }) => toNum(value))
  entryAmountPaise!: number;

  @ApiProperty()
  @Expose()
  valueDate!: string;

  @ApiProperty()
  @Expose()
  valueDateIsInferred!: boolean;

  @ApiProperty({ description: 'When the ledger entry was recorded' })
  @Expose()
  @Type(() => Date)
  entryCreatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  paymentMethod?: string | null;

  @ApiPropertyOptional()
  @Expose()
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Set when this row belongs to a reversing entry' })
  @Expose()
  reversesId?: string | null;

  @ApiPropertyOptional()
  @Expose()
  reversalReason?: string | null;

  @ApiPropertyOptional({ description: 'The entry this one reverses' })
  @Expose()
  reversesEntryNo?: string | null;

  @ApiPropertyOptional({ description: 'The entry that reversed this one' })
  @Expose()
  reversedByEntryNo?: string | null;

  @ApiProperty({ description: 'True when the waterfall chose this attribution, not a human' })
  @Expose()
  isInferred!: boolean;
}

export class MilestoneBalanceResponseDto {
  @ApiProperty()
  @Expose()
  milestoneId!: string;

  @ApiProperty()
  @Expose()
  displayOrder!: number;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  stage!: string;

  @ApiProperty({
    enum: ['customer', 'lender'],
    description: 'On a loan-financed project the bank pays its share',
  })
  @Expose()
  payerType!: string;

  @ApiPropertyOptional()
  @Expose()
  dueDate?: string | null;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  expectedPaise!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  allocatedPaise!: number;

  @ApiProperty({ description: 'What is still owed on this milestone — the "short by X" figure' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  balancePaise!: number;

  @ApiProperty({
    description:
      'Allocated beyond what was expected. Legitimate (genuine overpayment) and reported rather than blocked.',
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  overAllocatedPaise!: number;

  @ApiProperty({
    enum: ['pending', 'partial', 'paid', 'waived'],
    description: 'Derived, never stored',
  })
  @Expose()
  derivedStatus!: string;

  @ApiProperty()
  @Expose()
  daysOverdue!: number;

  @ApiProperty({
    description:
      'Distinct entries with an allocation here, reversal mirrors included. Use allocations.length for display.',
  })
  @Expose()
  entryCount!: number;

  @ApiProperty({
    type: [MilestoneAllocationResponseDto],
    description: 'Exactly which entries paid this milestone, and how much of each landed here',
  })
  @Expose()
  @Type(() => MilestoneAllocationResponseDto)
  allocations!: MilestoneAllocationResponseDto[];
}

export class ProjectLedgerSummaryDto {
  @ApiProperty({ description: 'SUM of all milestones — derived, not a stored column' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  contractPaise!: number;

  @ApiProperty({ description: 'The part of the contract that came from the signed quote' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  quotedPaise!: number;

  @ApiProperty({
    description: 'Agreed after signing. quotedPaise + changeOrderPaise === contractPaise, always.',
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  changeOrderPaise!: number;

  @ApiProperty({ description: 'SUM of ACTIVE milestones. Waived amounts are not expected.' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  expectedPaise!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  waivedPaise!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  receivedPaise!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  spentPaise!: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  outstandingPaise!: number;

  @ApiProperty({
    description:
      'Money received but not attributed to any milestone — customer credit. Surface this in the UI: ' +
      'an invisible credit balance is how reconciliation goes wrong.',
  })
  @Expose()
  @Transform(({ value }) => toNum(value))
  unallocatedPaise!: number;

  @ApiProperty({ description: 'received − spent' })
  @Expose()
  @Transform(({ value }) => toNum(value))
  netCashPaise!: number;

  @ApiProperty()
  @Expose()
  receiptCount!: number;

  @ApiProperty()
  @Expose()
  milestoneCount!: number;

  @ApiProperty({ type: [MilestoneBalanceResponseDto] })
  @Expose()
  @Type(() => MilestoneBalanceResponseDto)
  milestones!: MilestoneBalanceResponseDto[];
}
