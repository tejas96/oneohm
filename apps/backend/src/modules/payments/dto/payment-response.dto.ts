// ============================================
// IMPORTS
// ============================================
// Shared types
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentTransactionStatus } from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

/**
 * Response DTO for payment entity
 */
export class PaymentResponseDto {
  // ============================================
  // BASE FIELDS
  // ============================================
  @ApiProperty({ description: 'Payment ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Organization ID' })
  @Expose()
  organizationId!: string;

  @ApiProperty({ description: 'Project ID' })
  @Expose()
  projectId!: string;

  @ApiProperty({ description: 'Customer ID' })
  @Expose()
  customerId!: string;

  @ApiPropertyOptional({
    description: 'Payment term this receipt fulfills (null for advances).',
  })
  @Expose()
  paymentTermId?: string | null;

  // ============================================
  // PAYMENT INFO
  // ============================================
  @ApiProperty({ description: 'Unique payment number', example: 'PAY-2024-001' })
  @Expose()
  paymentNumber!: string;

  // ============================================
  // AMOUNT
  // ============================================
  @ApiProperty({ description: 'Expected payment amount', example: 50000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  expectedAmount!: number;

  @ApiProperty({ description: 'Actual paid amount', example: 50000.0 })
  @Expose()
  @Transform(({ value }) => toNum(value))
  paidAmount!: number;

  @ApiProperty({
    description: 'Date the money actually moved (IST business date), not the data-entry date',
    example: '2026-07-15',
  })
  @Expose()
  paidAt!: string;

  @ApiProperty({
    description:
      'True only for historical rows backfilled from created_at, whose true value date is unrecoverable',
    example: false,
  })
  @Expose()
  paidAtIsInferred!: boolean;

  // ============================================
  // PAYMENT METHOD
  // ============================================
  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @Expose()
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment reference number' })
  @Expose()
  paymentReference?: string;

  // ============================================
  // BANK DETAILS
  // ============================================
  @ApiPropertyOptional({ description: 'Bank name' })
  @Expose()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @Expose()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'IFSC code' })
  @Expose()
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Transaction ID' })
  @Expose()
  transactionId?: string;

  // ============================================
  // STATUS
  // ============================================
  @ApiProperty({ description: 'Payment status', enum: PaymentTransactionStatus })
  @Expose()
  status!: PaymentTransactionStatus;

  // ============================================
  // RECONCILIATION
  // ============================================
  @ApiPropertyOptional({ description: 'Reconciliation timestamp', type: Date })
  @Expose()
  @Type(() => Date)
  reconciledAt?: Date;

  @ApiPropertyOptional({ description: 'Reconciled by user ID' })
  @Expose()
  reconciledBy?: string;

  // ============================================
  // NOTES
  // ============================================
  @ApiPropertyOptional({ description: 'Additional notes' })
  @Expose()
  notes?: string;

  // ============================================
  // AUDIT FIELDS
  // ============================================
  @ApiProperty({ description: 'Creation timestamp', type: Date })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', type: Date })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Deletion timestamp', type: Date })
  @Expose()
  @Type(() => Date)
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string;
}
