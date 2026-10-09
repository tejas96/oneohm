import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { QuotesDashboard } from '@tejas96/shared/types';

import { istToday, resolveDashboardRange } from '../../../common/utils';
import { JwtAuthGuard } from '../../auth/guards';
import { QuotesDashboardQueryDto } from '../dto/dashboard/quotes-dashboard-query.dto';
import { QuoteDashboardService } from '../services/quote-dashboard.service';

const toFinancing = (v: string | undefined): 'cash' | 'loan' | null =>
  v === 'cash' || v === 'loan' ? v : null;

/**
 * The /quotes deal dashboard. Its own controller, registered before
 * QuoteController, so `dashboard` is never read as a quote `:id`.
 * No @ResellerAllowed(): resellers have no web login and get 403 here.
 */
@ApiTags('Quotes & Quotations')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuoteDashboardController {
  constructor(private readonly dashboard: QuoteDashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Quotes dashboard',
    description:
      'Deals (one per property) by stage, needs action, team, biggest open deals, lead sources ' +
      'and a 12-month trend — all from DEAL_FACTS_CTE, so each figure equals the quote list it links to.',
  })
  async getDashboard(@Query() query: QuotesDashboardQueryDto): Promise<QuotesDashboard> {
    const today = istToday();
    return this.dashboard.getDashboard({
      range: resolveDashboardRange(query.period ?? 'this_month', query.from, query.to, today),
      today,
      person: query.person ?? null,
      financing: toFinancing(query.financing),
    });
  }
}
