import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse } from '@tejas96/shared/types';

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
import {
  CashFlowQueryDto,
  LedgerEntriesQueryDto,
  ReceivablesQueryDto,
} from '../dto/ledger-query.dto';
import { FinanceAggregationService } from '../services/finance-aggregation.service';
import { FinanceReportingService } from '../services/finance-reporting.service';

/**
 * Default the reporting window to the current calendar month, matching the
 * existing dashboard behaviour so the two surfaces agree.
 */
function resolveRange(from?: string, to?: string): { from: string; to: string } {
  if (from && to) {
    return { from, to };
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const first = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { from: from ?? first, to: to ?? `${y}-${pad(m + 1)}-${pad(lastDay)}` };
}

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
  constructor(
    private readonly aggregationService: FinanceAggregationService,
    private readonly reportingService: FinanceReportingService,
  ) {}

  // ============================================
  // 1. DASHBOARD
  // ============================================
  /**
   * Ledger-backed reporting surface.
   *
   * Added ALONGSIDE the legacy endpoints below rather than replacing them in
   * place. The legacy DTOs are still consumed by the current web app, and
   * reshaping a response contract during a data migration is how you end up
   * debugging two changes at once. The old endpoints are retired together with
   * the pages that call them.
   */

  @Get('kpis')
  @ApiOperation({
    summary: 'Period KPIs from the ledger',
    description:
      'Revenue, spend and net are FLOWS bounded by value_date — the date the money actually ' +
      'moved, not when it was keyed in. Outstanding and unallocated credit are SNAPSHOTS as of ' +
      'today: money owed does not belong to a month.',
  })
  async getKpis(
    @Query() query: DashboardQueryDto,
  ): Promise<Awaited<ReturnType<FinanceReportingService['getKpis']>>> {
    const { from, to } = resolveRange(query.from, query.to);
    return this.reportingService.getKpis(from, to);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Cash in/out over time, keyed on value date' })
  async getCashFlow(
    @Query() query: CashFlowQueryDto,
  ): Promise<Awaited<ReturnType<FinanceReportingService['getCashFlow']>>> {
    const { from, to } = resolveRange(query.from, query.to);
    return this.reportingService.getCashFlow(from, to, query.grain ?? 'month');
  }

  @Get('entries')
  @ApiOperation({
    summary: 'The ledger — money in and out in one list',
    description: 'Replaces the separate receipts and expenses endpoints, which had drifted apart.',
  })
  async getEntries(
    @Query() query: LedgerEntriesQueryDto,
  ): Promise<Awaited<ReturnType<FinanceReportingService['getEntries']>>> {
    return this.reportingService.getEntries({
      direction: query.direction ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
      projectId: query.projectId ?? null,
      customerId: query.customerId ?? null,
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  @Get('receivables')
  @ApiOperation({
    summary: 'Every open milestone across the org — expected, received, short by',
    description:
      'Waived milestones are excluded, so a written-off residual stops being chased. ' +
      'Replaces the outstanding + customers-AR pair.',
  })
  async getReceivables(
    @Query() query: ReceivablesQueryDto,
  ): Promise<Awaited<ReturnType<FinanceReportingService['getReceivables']>>> {
    return this.reportingService.getReceivables({
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  // ============================================
  // LEGACY — retired with the pages that call them
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
  async getDashboard(@Query() query: DashboardQueryDto): Promise<DashboardDto> {
    return this.aggregationService.getDashboard(query.from, query.to);
  }

  // ============================================
  // 2. RECEIPTS LEDGER
  // ============================================
  @Get('receipts')
  @ApiOperation({
    summary: 'Org-wide receipts ledger',
    description:
      'Paginated list of receipts across all projects. ' +
      'Includes joined project + customer fields so PDF templates work without an extra fetch.',
  })
  async getReceipts(
    @Query() query: ReceiptsQueryDto,
  ): Promise<PaginatedResponse<ReceiptListItemDto>> {
    return this.aggregationService.getReceipts(query);
  }

  // ============================================
  // 3. EXPENSES LEDGER
  // ============================================
  @Get('expenses')
  @ApiOperation({
    summary: 'Org-wide expenses ledger',
    description: 'Paginated list of project expenses with project joins.',
  })
  async getExpenses(
    @Query() query: ExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseListItemDto>> {
    return this.aggregationService.getExpenses(query);
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
    @Query() query: OutstandingQueryDto,
  ): Promise<PaginatedResponse<OutstandingTermDto>> {
    return this.aggregationService.getOutstanding(query);
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
  async getCustomersAr(@Query() query: CustomersArQueryDto): Promise<CustomerAgingDto[]> {
    return this.aggregationService.getCustomersAr(query);
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
  async getVendorsSpend(@Query() query: VendorsSpendQueryDto): Promise<VendorSpendDto[]> {
    return this.aggregationService.getVendorsSpend(query);
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
    @Query() query: ProfitabilityQueryDto,
  ): Promise<PaginatedResponse<ProjectProfitabilityDto>> {
    return this.aggregationService.getProfitability(query);
  }
}
