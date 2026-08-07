import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentTransactionStatus,
  ReimbursementStatus,
} from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Common query options for org finance endpoints. The OrganizationContext
 * decorator pulls organizationId from header/query — these DTOs whitelist
 * the additional filters supported per endpoint.
 *
 * `organizationId` is intentionally NOT declared here; it's passed via the
 * decorator. Declaring it would cause global ValidationPipe (whitelist:
 * true) to keep it on dtos but it's already trusted from the decorator.
 */

export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class DashboardQueryDto extends DateRangeQueryDto {
  // organizationId comes from @OrganizationContext()
}

export class PaginationQueryBase {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;

}

export class ReceiptsQueryDto extends PaginationQueryBase {
  @ApiPropertyOptional({ enum: PaymentTransactionStatus })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({ description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Search across paymentNumber/reference/customerName' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class OutstandingQueryDto extends PaginationQueryBase {
  @ApiPropertyOptional({
    description: 'Aging bucket filter',
    enum: ['current', '0-30', '31-60', '61-90', '90+'],
  })
  @IsOptional()
  @IsString()
  bucket?: 'current' | '0-30' | '31-60' | '61-90' | '90+';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Search across project name/number, customer name, term name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort key',
    enum: ['daysOverdue', 'dueDate', 'amount', 'customer', 'project'],
    default: 'daysOverdue',
  })
  @IsOptional()
  @IsString()
  sort?: 'daysOverdue' | 'dueDate' | 'amount' | 'customer' | 'project';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

export class CustomersArQueryDto {

  @ApiPropertyOptional({ description: 'As-of date for aging calc (YYYY-MM-DD); defaults to today' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}

export class VendorsSpendQueryDto extends DateRangeQueryDto {

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

/**
 * Profitability is a project-lifetime metric: latest quoted revenue vs
 * all-time posted spend. We intentionally do NOT accept a date range
 * because mixing range-filtered spend with lifetime quoted revenue
 * produces meaningless margins (projects with all spend outside the
 * range appear as "100% margin" — see V1 QA note).
 */
export class ProfitabilityQueryDto extends PaginationQueryBase {}

export class ExpensesQueryDto extends PaginationQueryBase {
  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({ enum: ExpensePaidByType })
  @IsOptional()
  @IsEnum(ExpensePaidByType)
  paidBy?: ExpensePaidByType;

  @ApiPropertyOptional({ enum: ReimbursementStatus })
  @IsOptional()
  @IsEnum(ReimbursementStatus)
  reimbursementStatus?: ReimbursementStatus;

  @ApiPropertyOptional({ description: 'Vendor-name substring (case-insensitive)' })
  @IsOptional()
  @IsString()
  vendorSearch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
