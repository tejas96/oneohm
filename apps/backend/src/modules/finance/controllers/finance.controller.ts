import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  DashboardDto,
  DashboardQueryDto,
  ExpenseListItemDto,
  ExpensesQueryDto,
  ReceiptListItemDto,
  ReceiptsQueryDto,
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
}
