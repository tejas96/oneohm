import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTermStatus } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

import { AGING_BUCKETS, type AgingBucket } from '../constants';

/**
 * One row of the org-wide unpaid payment-terms ledger. A "term" is a planned
 * receivable installment (project_payment_terms) with paidAmount < expectedAmount
 * and status not in (waived, cancelled).
 */
export class OutstandingTermDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiProperty()
  @Expose()
  projectNumber!: string;

  @ApiProperty()
  @Expose()
  projectName!: string;

  @ApiProperty()
  @Expose()
  customerId!: string;

  @ApiProperty()
  @Expose()
  customerName!: string;

  @ApiProperty()
  @Expose()
  stage!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD or null if undated' })
  @Expose()
  dueDate?: string | null;

  @ApiProperty()
  @Expose()
  expectedAmount!: number;

  @ApiProperty()
  @Expose()
  paidAmount!: number;

  @ApiProperty({ description: 'expectedAmount - paidAmount' })
  @Expose()
  outstandingAmount!: number;

  @ApiProperty({ enum: PaymentTermStatus })
  @Expose()
  status!: PaymentTermStatus;

  @ApiProperty({ description: 'Negative = upcoming, positive = overdue, null = no due_date' })
  @Expose()
  daysOverdue!: number | null;

  @ApiProperty({ enum: AGING_BUCKETS as unknown as string[] })
  @Expose()
  agingBucket!: AgingBucket;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}

export class CustomerAgingDto {
  @ApiProperty()
  @Expose()
  customerId!: string;

  @ApiProperty()
  @Expose()
  customerName!: string;

  @ApiPropertyOptional()
  @Expose()
  customerPhone?: string | null;

  @ApiPropertyOptional()
  @Expose()
  customerEmail?: string | null;

  @ApiProperty({ description: 'Sum across all aging buckets' })
  @Expose()
  totalOutstanding!: number;

  @ApiProperty({ description: 'Open with due_date >= today (or no due_date)' })
  @Expose()
  current!: number;

  @ApiProperty({ description: '1-30 days overdue' })
  @Expose()
  bucket0to30!: number;

  @ApiProperty({ description: '31-60 days overdue' })
  @Expose()
  bucket31to60!: number;

  @ApiProperty({ description: '61-90 days overdue' })
  @Expose()
  bucket61to90!: number;

  @ApiProperty({ description: '90+ days overdue' })
  @Expose()
  bucket90plus!: number;

  @ApiPropertyOptional({ type: Date, description: 'Most recent receipt across all projects' })
  @Expose()
  @Type(() => Date)
  lastReceiptDate?: Date | null;

  @ApiProperty({ description: 'Number of open terms' })
  @Expose()
  openTermCount!: number;
}
