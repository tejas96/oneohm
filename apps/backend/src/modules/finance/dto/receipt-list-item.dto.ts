import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentTransactionStatus } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

/**
 * Org-wide Receipts ledger row. Includes joined project & customer fields
 * so the existing per-project receipt PDF templates work without an extra
 * `useProject` round-trip per click (plan §"Self-review fixes").
 */
export class ReceiptListItemDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  paymentNumber!: string;

  @ApiProperty()
  @Expose()
  paidAmount!: number;

  @ApiProperty()
  @Expose()
  expectedAmount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @Expose()
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: PaymentTransactionStatus })
  @Expose()
  status!: PaymentTransactionStatus;

  @ApiPropertyOptional()
  @Expose()
  paymentReference?: string | null;

  @ApiPropertyOptional()
  @Expose()
  paymentTermId?: string | null;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiPropertyOptional({ type: Date })
  @Expose()
  @Type(() => Date)
  reconciledAt?: Date | null;

  // Joined project fields (needed by PDF templates)
  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiProperty()
  @Expose()
  projectNumber!: string;

  @ApiProperty()
  @Expose()
  projectName!: string;

  // Joined customer fields (needed by PDF templates)
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

  @ApiPropertyOptional({ description: 'Concat of address/city/state/pincode' })
  @Expose()
  customerAddressLine?: string | null;
}
