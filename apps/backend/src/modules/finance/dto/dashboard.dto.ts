import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory } from '@oneohm-epc/shared/types';
import { Expose, Type } from 'class-transformer';

/**
 * Dashboard payload powering the Finance executive overview in a single
 * round-trip.
 *
 * KPI semantics — see plan §"Self-review fixes":
 *  - `*InRange` fields obey the requested {from,to} window.
 *  - `*Now`/`*Trailing90` fields are point-in-time and IGNORE the range.
 */

export class DashboardRangeDto {
  @ApiProperty({ description: 'Inclusive start date (YYYY-MM-DD)' })
  @Expose()
  from!: string;

  @ApiProperty({ description: 'Inclusive end date (YYYY-MM-DD)' })
  @Expose()
  to!: string;
}

export class DashboardKpisDto {
  @ApiProperty({ description: 'Sum of receipts cleared in [from,to]' })
  @Expose()
  revenueInRange!: number;

  @ApiProperty({ description: 'Sum of expenses with expense_date in [from,to]' })
  @Expose()
  spendInRange!: number;

  @ApiProperty({ description: 'revenueInRange - spendInRange' })
  @Expose()
  netCashflowInRange!: number;

  @ApiProperty({ description: 'Outstanding receivable as of now (point-in-time)' })
  @Expose()
  outstandingNow!: number;

  @ApiProperty({ description: 'Number of overdue payment terms now (point-in-time)' })
  @Expose()
  overdueCountNow!: number;

  @ApiProperty({ description: 'Average days from term due_date to first receipt, trailing 90d' })
  @Expose()
  avgDaysToCollectTrailing90!: number;
}

export class DashboardCashFlowPointDto {
  @ApiProperty({ description: 'Month bucket (YYYY-MM)' })
  @Expose()
  month!: string;

  @ApiProperty()
  @Expose()
  cashIn!: number;

  @ApiProperty()
  @Expose()
  cashOut!: number;

  @ApiProperty()
  @Expose()
  net!: number;
}

export class DashboardSpendByCategoryDto {
  @ApiProperty({ enum: ExpenseCategory })
  @Expose()
  category!: ExpenseCategory;

  @ApiProperty()
  @Expose()
  total!: number;
}

export class DashboardTopCustomerDto {
  @ApiProperty()
  @Expose()
  customerId!: string;

  @ApiProperty()
  @Expose()
  customerName!: string;

  @ApiProperty()
  @Expose()
  outstanding!: number;
}

export class DashboardTopVendorDto {
  @ApiProperty({ description: 'Lowercased+trimmed vendor name (matching key)' })
  @Expose()
  vendorKey!: string;

  @ApiProperty({ description: 'Display name (first occurrence casing)' })
  @Expose()
  vendorName!: string;

  @ApiProperty()
  @Expose()
  totalSpend!: number;
}

export class DashboardActivityItemDto {
  @ApiProperty({ enum: ['receipt', 'expense'] })
  @Expose()
  type!: 'receipt' | 'expense';

  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiProperty()
  @Expose()
  projectName!: string;

  @ApiProperty()
  @Expose()
  amount!: number;

  @ApiProperty({ type: Date })
  @Expose()
  @Type(() => Date)
  at!: Date;
}

export class DashboardDto {
  @ApiProperty({ type: DashboardRangeDto })
  @Expose()
  @Type(() => DashboardRangeDto)
  range!: DashboardRangeDto;

  @ApiProperty({ type: DashboardKpisDto })
  @Expose()
  @Type(() => DashboardKpisDto)
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: [DashboardCashFlowPointDto] })
  @Expose()
  @Type(() => DashboardCashFlowPointDto)
  cashFlowMonthly!: DashboardCashFlowPointDto[];

  @ApiProperty({ type: [DashboardSpendByCategoryDto] })
  @Expose()
  @Type(() => DashboardSpendByCategoryDto)
  spendByCategory!: DashboardSpendByCategoryDto[];

  @ApiProperty({ type: [DashboardTopCustomerDto] })
  @Expose()
  @Type(() => DashboardTopCustomerDto)
  topCustomersOutstanding!: DashboardTopCustomerDto[];

  @ApiProperty({ type: [DashboardTopVendorDto] })
  @Expose()
  @Type(() => DashboardTopVendorDto)
  topVendorsSpend!: DashboardTopVendorDto[];

  @ApiProperty({ type: [DashboardActivityItemDto] })
  @Expose()
  @Type(() => DashboardActivityItemDto)
  recentActivity!: DashboardActivityItemDto[];
}
