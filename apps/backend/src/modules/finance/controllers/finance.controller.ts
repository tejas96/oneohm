import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CustomerAgingDto,
  CustomersArQueryDto,
  DashboardDto,
  DashboardQueryDto,
  ExpenseListItemDto,
  ExpensesQueryDto,
  OutstandingQueryDto,
  OutstandingTermDto,
  ProfitabilityQueryDto,
  ProjectProfitabilityDto,
  ReceiptListItemDto,
  ReceiptsQueryDto,
  VendorsSpendQueryDto,
  VendorSpendDto,
} from '../dto';
import { FinanceAggregationService } from '../services/finance-aggregation.service';

/**
 * FinanceController
 *
 * Read-only org-wide aggregations powering the Finance module pages.
 * All endpoints are org-scoped via @OrganizationContext() and protected
 * by JwtAuthGuard. No permission gating in V1 (open to all authenticated
 * users — see plan §"Confirmed product decisions").
 */
@ApiTags('Finance — Org Aggregations')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly aggregationService: FinanceAggregationService) {}

  // ============================================
  // 1. DASHBOARD
  // ============================================
  @Get('dashboard')
  @ApiOperation({
    summary: 'Org finance dashboard',
    description:
      'Single fat endpoint that returns 6 KPIs, 12-month cash-flow trend, ' +
      'spend-by-category breakdown, top 5 customers outstanding (point-in-time), ' +
      'top 5 vendors by spend (in range), and last 10 activity items. ' +
      'Defaults range to the current calendar month if from/to omitted.',
  })
  async getDashboard(
    @OrganizationContext() organizationId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardDto> {
    return this.aggregationService.getDashboard(organizationId, query.from, query.to);
  }

  // ============================================
  // 2. RECEIPTS LEDGER
  // ============================================
  @Get('receipts')
  @ApiOperation({
    summary: 'Org-wide receipts ledger',
    description:
      'Paginated list of receipts across all projects in the organization. ' +
      'Includes joined project + customer fields so PDF templates work without an extra fetch.',
  })
  async getReceipts(
    @OrganizationContext() organizationId: string,
    @Query() query: ReceiptsQueryDto,
  ): Promise<PaginatedResponse<ReceiptListItemDto>> {
    return this.aggregationService.getReceipts(organizationId, query);
  }

  // ============================================
  // 3. EXPENSES LEDGER
  // ============================================
  @Get('expenses')
  @ApiOperation({
    summary: 'Org-wide expenses ledger',
    description: 'Paginated list of project expenses across the organization with project joins.',
  })
  async getExpenses(
    @OrganizationContext() organizationId: string,
    @Query() query: ExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseListItemDto>> {
    return this.aggregationService.getExpenses(organizationId, query);
  }

  // ============================================
  // 4. OUTSTANDING — unpaid payment terms
  // ============================================
  @Get('outstanding')
  @ApiOperation({
    summary: 'Org-wide unpaid payment terms (outstanding receivables)',
    description:
      'Paginated list of payment terms with paid_amount < expected_amount and ' +
      'status NOT IN (waived, cancelled). Supports filter by aging bucket, ' +
      'customer/project, and free-text search across project + customer + term name.',
  })
  async getOutstanding(
    @OrganizationContext() organizationId: string,
    @Query() query: OutstandingQueryDto,
  ): Promise<PaginatedResponse<OutstandingTermDto>> {
    return this.aggregationService.getOutstanding(organizationId, query);
  }

  // ============================================
  // 5. CUSTOMERS AR — aging buckets per customer
  // ============================================
  @Get('customers/ar')
  @ApiOperation({
    summary: 'Per-customer AR aging buckets',
    description:
      'Returns one row per customer with totalOutstanding broken into 5 aging ' +
      'buckets (current, 0-30, 31-60, 61-90, 90+). Optional asOfDate (default today).',
  })
  async getCustomersAr(
    @OrganizationContext() organizationId: string,
    @Query() query: CustomersArQueryDto,
  ): Promise<CustomerAgingDto[]> {
    return this.aggregationService.getCustomersAr(organizationId, query);
  }

  // ============================================
  // 6. VENDORS SPEND
  // ============================================
  @Get('vendors/spend')
  @ApiOperation({
    summary: 'Per-vendor spend analytics',
    description:
      'Vendor analytics over a date range: total spend, expense count, ' +
      'last expense, top category, reimbursed %, and per-category breakdown. ' +
      'Vendor matching is case-insensitive on TRIM(vendor_name).',
  })
  async getVendorsSpend(
    @OrganizationContext() organizationId: string,
    @Query() query: VendorsSpendQueryDto,
  ): Promise<VendorSpendDto[]> {
    return this.aggregationService.getVendorsSpend(organizationId, query);
  }

  // ============================================
  // 7. PROJECT PROFITABILITY
  // ============================================
  @Get('projects/profitability')
  @ApiOperation({
    summary: 'Project profitability table',
    description:
      'Per-project: quotedRevenue (latest quote_versions.final_price via LATERAL join), ' +
      'receivedAmount, totalSpend, margin (₹ + %), bomTarget vs actual variance.',
  })
  async getProfitability(
    @OrganizationContext() organizationId: string,
    @Query() query: ProfitabilityQueryDto,
  ): Promise<PaginatedResponse<ProjectProfitabilityDto>> {
    return this.aggregationService.getProfitability(organizationId, query);
  }
}
