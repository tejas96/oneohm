import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  SalesPipelineQueryDto,
  SalesPipelineTrendQueryDto,
  type SalesPipelineDashboardResponseDto,
  type SalesPipelineFunnelResponseDto,
  type SalesPipelineLeaderboardResponseDto,
  type SalesPipelineStatsResponseDto,
  type SalesPipelineTrendResponseDto,
} from './dto';
import { SalesPipelineService } from './sales-pipeline.service';
import { JwtAuthGuard } from '../../../auth/guards';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics/sales-pipeline')
// There is NO global auth guard in this app — app.module.ts registers only
// ThrottlerGuard. Without this line every route here is PUBLIC, and this one
// serves the whole funnel, win rates and the salesperson leaderboard. It was
// unguarded and returning 200 to an anonymous caller until 2026-08-22.
@UseGuards(JwtAuthGuard)
export class SalesPipelineController {
  constructor(private readonly salesPipelineService: SalesPipelineService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Combined sales pipeline dashboard',
    description:
      'Single endpoint returning funnel, stats, leaderboard, and trend for the page. ' +
      'Uses SQL aggregations — one round-trip instead of four parallel cohort scans.',
  })
  async getDashboard(
    @Query() query: SalesPipelineTrendQueryDto,
  ): Promise<SalesPipelineDashboardResponseDto> {
    return this.salesPipelineService.getDashboard(
      query.fromDate,
      query.toDate,
      query.salesPersonId,
      query.granularity ?? 'week',
    );
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Sales funnel stage counts and values' })
  async getFunnel(@Query() query: SalesPipelineQueryDto): Promise<SalesPipelineFunnelResponseDto> {
    return this.salesPipelineService.getFunnel(query.fromDate, query.toDate, query.salesPersonId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Sales pipeline KPI statistics' })
  async getStats(@Query() query: SalesPipelineQueryDto): Promise<SalesPipelineStatsResponseDto> {
    return this.salesPipelineService.getStats(query.fromDate, query.toDate, query.salesPersonId);
  }

  @Get('by-salesperson')
  @ApiOperation({ summary: 'Salesperson leaderboard' })
  async getLeaderboard(
    @Query() query: SalesPipelineQueryDto,
  ): Promise<SalesPipelineLeaderboardResponseDto> {
    return this.salesPipelineService.getLeaderboard(query.fromDate, query.toDate);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Leads vs won trend over time' })
  async getTrend(
    @Query() query: SalesPipelineTrendQueryDto,
  ): Promise<SalesPipelineTrendResponseDto> {
    return this.salesPipelineService.getTrend(
      query.fromDate,
      query.toDate,
      query.granularity ?? 'week',
      query.salesPersonId,
    );
  }
}
