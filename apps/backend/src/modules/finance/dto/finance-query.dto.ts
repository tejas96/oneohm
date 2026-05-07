import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentTransactionStatus,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';
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
  @ApiPropertyOptional({ description: 'Set automatically by OrganizationContext.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
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

  @ApiPropertyOptional({ description: 'Set automatically by OrganizationContext.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
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
  @ApiPropertyOptional({ description: 'Aging bucket filter', enum: ['current', '0-30', '31-60', '61-90', '90+'] })
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

  @ApiPropertyOptional({ description: 'Search across project name/number, customer name, term name' })
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
  @ApiPropertyOptional({ description: 'Set automatically by OrganizationContext.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'As-of date for aging calc (YYYY-MM-DD); defaults to today' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}

export class VendorsSpendQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Set automatically by OrganizationContext.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

export class ProfitabilityQueryDto extends PaginationQueryBase {
  @ApiPropertyOptional({ description: 'Inclusive start date (YYYY-MM-DD) for expenses & receipts' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (YYYY-MM-DD) for expenses & receipts' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

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
