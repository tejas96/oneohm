import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentMethod,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';
import { Expose, Type } from 'class-transformer';

/**
 * Org-wide Expenses ledger row. Project fields joined so PDFs/exports
 * don't need a follow-up project fetch.
 */
export class ExpenseListItemDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  expenseNumber!: string;

  @ApiProperty({ enum: ExpenseCategory })
  @Expose()
  category!: ExpenseCategory;

  @ApiPropertyOptional()
  @Expose()
  vendorName?: string | null;

  @ApiProperty()
  @Expose()
  amount!: number;

  @ApiProperty()
  @Expose()
  currency!: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @Expose()
  expenseDate!: string;

  @ApiProperty({ enum: PaymentMethod })
  @Expose()
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: ExpensePaidByType })
  @Expose()
  paidBy!: ExpensePaidByType;

  @ApiProperty({ enum: ReimbursementStatus })
  @Expose()
  reimbursementStatus!: ReimbursementStatus;

  @ApiPropertyOptional()
  @Expose()
  notes?: string | null;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  // Joined project fields
  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiProperty()
  @Expose()
  projectNumber!: string;

  @ApiProperty()
  @Expose()
  projectName!: string;
}
