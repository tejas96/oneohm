import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, ExpensePaidByType, ReimbursementStatus } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query string for `GET /projects/:projectId/expenses`.
 */
export class ListExpensesQueryDto {
  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @ApiPropertyOptional({ description: 'Filter expense_date >= dateFrom' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter expense_date <= dateTo' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Substring search on vendor_name (ILIKE)' })
  @IsString()
  @IsOptional()
  vendorSearch?: string;

  @ApiPropertyOptional({ enum: ExpensePaidByType })
  @IsEnum(ExpensePaidByType)
  @IsOptional()
  paidBy?: ExpensePaidByType;

  @ApiPropertyOptional({ enum: ReimbursementStatus })
  @IsEnum(ReimbursementStatus)
  @IsOptional()
  reimbursementStatus?: ReimbursementStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
