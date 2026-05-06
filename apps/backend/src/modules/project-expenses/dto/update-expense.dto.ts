import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentMethod,
} from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ExpenseProductLinkDto } from './expense-product-link.dto';

/**
 * Edit fields on a project expense. Excludes:
 *   - expenseNumber, organizationId, projectId, createdBy
 *   - override_used / override_reason  (immutable post-create)
 *   - reimbursement_status              (use /:id/reimbursement-status)
 *
 * When productLinks is supplied, the service computes the delta against
 * the existing links and inserts compensating RETURN/PURCHASE inventory
 * transactions in the same DB transaction (plan §2.6).
 */
export class UpdateExpenseDto {
  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  vendorName?: string;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: ExpensePaidByType })
  @IsEnum(ExpensePaidByType)
  @IsOptional()
  paidBy?: ExpensePaidByType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  paidByEmployeeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    type: () => [ExpenseProductLinkDto],
    description:
      'Replace the existing product links with this new set. Service computes delta and posts compensating inventory transactions.',
  })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ExpenseProductLinkDto)
  @IsOptional()
  productLinks?: ExpenseProductLinkDto[];
}
