// ============================================
// IMPORTS
// ============================================
// Shared types
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentTransactionStatus } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

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

  @ApiPropertyOptional({ description: 'Milestone ID' })
  @Expose()
  milestoneId?: string;

  @ApiProperty({ description: 'Customer ID' })
  @Expose()
  customerId!: string;

  // ============================================
  // PAYMENT INFO
  // ============================================
  @ApiProperty({ description: 'Unique payment number', example: 'PAY-2024-001' })
  @Expose()
  paymentNumber!: string;

  @ApiProperty({ description: 'Date of payment', type: Date })
  @Expose()
  @Type(() => Date)
  paymentDate!: Date;

  // ============================================
  // AMOUNT
  // ============================================
  @ApiProperty({ description: 'Expected payment amount', example: 50000.0 })
  @Expose()
  @Type(() => Number)
  expectedAmount!: number;

  @ApiProperty({ description: 'Actual paid amount', example: 50000.0 })
  @Expose()
  @Type(() => Number)
  paidAmount!: number;

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
