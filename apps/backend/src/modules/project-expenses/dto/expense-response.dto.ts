import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentMethod,
  ReimbursementStatus,
} from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

class ExpenseProductLinkResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiPropertyOptional()
  @Expose()
  productId?: string | null;

  @ApiPropertyOptional()
  @Expose()
  itemName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  unit?: string | null;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNum(value))
  quantity!: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => (value === null || value === undefined ? null : toNum(value)))
  unitPrice?: number | null;

  @ApiPropertyOptional()
  @Expose()
  notes?: string | null;
}

export class ExpenseResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;


  @ApiProperty()
  @Expose()
  projectId!: string;

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
  @Transform(({ value }) => toNum(value))
  amount!: number;

  @ApiProperty()
  @Expose()
  currency!: string;

  @ApiProperty({ description: 'ISO date (YYYY-MM-DD)' })
  @Expose()
  expenseDate!: string;

  @ApiProperty({ enum: PaymentMethod })
  @Expose()
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: ExpensePaidByType })
  @Expose()
  paidBy!: ExpensePaidByType;

  @ApiPropertyOptional()
  @Expose()
  paidByEmployeeId?: string | null;

  @ApiProperty({ enum: ReimbursementStatus })
  @Expose()
  reimbursementStatus!: ReimbursementStatus;

  @ApiPropertyOptional({ type: Date })
  @Expose()
  @Type(() => Date)
  reimbursedAt?: Date | null;

  @ApiPropertyOptional()
  @Expose()
  reimbursedBy?: string | null;

  @ApiProperty()
  @Expose()
  overrideUsed!: boolean;

  @ApiPropertyOptional()
  @Expose()
  overrideReason?: string | null;

  @ApiPropertyOptional()
  @Expose()
  notes?: string | null;

  @ApiPropertyOptional({ type: () => [ExpenseProductLinkResponseDto] })
  @Expose()
  @Type(() => ExpenseProductLinkResponseDto)
  productLinks?: ExpenseProductLinkResponseDto[];

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiPropertyOptional({ type: Date })
  @Expose()
  @Type(() => Date)
  deletedAt?: Date | null;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string | null;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string | null;
}
