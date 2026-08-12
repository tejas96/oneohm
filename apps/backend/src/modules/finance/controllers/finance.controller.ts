import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse } from '@tejas96/shared/types';

import { JwtAuthGuard } from '../../auth/guards';
import { CustomerAgingDto, OutstandingQueryDto, OutstandingTermDto } from '../dto';
import {
  CashFlowQueryDto,
  LedgerEntriesQueryDto,
  LedgerRangeQueryDto,
  ReceivablesQueryDto,
} from '../dto/ledger-query.dto';
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
  constructor(private readonly reportingService: FinanceReportingService) {}

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
    @Query() query: LedgerRangeQueryDto,
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
  // OUTSTANDING — unpaid payment terms
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
    return this.reportingService.getOutstanding(query);
  }

  // ============================================
  // CUSTOMERS AR — aging buckets per customer
  // ============================================
  @Get('customers/ar')
  @ApiOperation({
    summary: 'Per-customer AR aging buckets',
    description:
      'One row per customer with totalOutstanding broken into 5 aging buckets ' +
      '(current, 0-30, 31-60, 61-90, 90+), derived from the ledger. ' +
      'Ageing is always as of today: the legacy asOfDate parameter was dropped ' +
      'because no caller used it and the milestone view computes days overdue ' +
      'against the current date, so honouring it would have required a ' +
      'different query rather than a silently ignored argument.',
  })
  async getCustomersAr(): Promise<CustomerAgingDto[]> {
    return this.reportingService.getCustomersAr();
  }
}
