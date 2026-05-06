import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentMethod,
} from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ExpenseProductLinkDto } from './expense-product-link.dto';

/**
 * Create a project expense (plan §3.3). Categories other than `materials`
 * MUST omit `productLinks` (the service rejects them) — itemization is a
 * materials-only concept. The override fields require the
 * `expenses:override-procurement-guard` permission server-side.
 */
export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiPropertyOptional({ description: 'Free-text vendor name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  vendorName?: string;

  @ApiProperty({ description: 'Total expense amount (must be > 0)', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'Expense date (ISO date). Cannot be in the future.' })
  @IsDateString()
  expenseDate!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ enum: ExpensePaidByType, default: ExpensePaidByType.COMPANY })
  @IsEnum(ExpensePaidByType)
  @IsOptional()
  paidBy?: ExpensePaidByType;

  @ApiPropertyOptional({
    description: 'Required when paidBy=employee. Must belong to the same organization.',
  })
  @ValidateIf((o: CreateExpenseDto) => o.paidBy === ExpensePaidByType.EMPLOYEE)
  @IsUUID()
  @IsNotEmpty()
  paidByEmployeeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    type: () => [ExpenseProductLinkDto],
    description:
      'Itemization. Only allowed when category=materials. Omit for lump-sum expenses.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseProductLinkDto)
  @IsOptional()
  productLinks?: ExpenseProductLinkDto[];

  @ApiPropertyOptional({
    description:
      'When true, bypasses the per-product procurement guard. Requires the expenses:override-procurement-guard permission. overrideReason becomes mandatory.',
  })
  @IsBoolean()
  @IsOptional()
  override?: boolean;

  @ApiPropertyOptional({
    description:
      'Audit reason for the override (mandatory when override=true). Captured immutably.',
  })
  @ValidateIf((o: CreateExpenseDto) => o.override === true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  overrideReason?: string;
}
