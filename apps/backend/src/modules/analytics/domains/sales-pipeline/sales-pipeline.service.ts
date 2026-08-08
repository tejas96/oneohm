import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  SALES_PIPELINE_STAGE_IDS,
  SALES_PIPELINE_STAGE_LABELS,
} from './constants/sales-pipeline-stages';
import type {
  SalesPipelineDashboardResponseDto,
  SalesPipelineFunnelResponseDto,
  SalesPipelineLeaderboardEntryDto,
  SalesPipelineLeaderboardResponseDto,
  SalesPipelineStatsResponseDto,
  SalesPipelineTrendResponseDto,
} from './dto';
import {
  buildCohortCte,
  buildFunnelAndStatsAggregationSql,
  buildLeaderboardSql,
  buildTrendSql,
  type SalesPipelineFilterParams,
} from './helpers/sales-pipeline-sql.helper';
import {
  computeConversionRate,
  computePreviousWindow,
  computeTrendMetric,
  parseNumericValue,
  resolveStatsWindow,
} from '../../common';

interface FunnelAndStatsAggRow {
  leads_count: number;
  leads_value: string | number;
  qualified_count: number;
  qualified_value: string | number;
  quoted_count: number;
  quoted_value: string | number;
  negotiation_count: number;
  negotiation_value: string | number;
  won_count: number;
  won_value: string | number;
  lost_count: number;
  lost_value: string | number;
  total_pipeline_value: string | number;
  avg_deal_size: string | number;
  stats_won_count: number;
  stats_lost_count: number;
  avg_sales_cycle_days: string | number;
}

interface LeaderboardAggRow {
  sales_person_id: string | null;
  property_count: number;
  pipeline_value: string | number;
  won_count: number;
  lost_count: number;
}

interface TrendAggRow {
  period: string;
  leads_count: number;
  won_count: number;
}

@Injectable()
export class SalesPipelineService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getDashboard(
    fromDate?: string,
    toDate?: string,
    salesPersonId?: string,
    granularity: 'week' | 'month' = 'week',
  ): Promise<SalesPipelineDashboardResponseDto> {
    const window = resolveStatsWindow(fromDate, toDate);
    const filters = this.buildFilters(
      window.fromDate,
      window.toDate,
      salesPersonId,
    );
    const leaderboardFilters = this.buildFilters(window.fromDate, window.toDate);
    const prevWindow = computePreviousWindow(window.fromDate, window.toDate);
    const prevFilters = this.buildFilters(
      prevWindow.fromDate,
      prevWindow.toDate,
      salesPersonId,
    );

    const [funnelAndStats, leaderboard, trend, prevStats] = await Promise.all([
      this.queryFunnelAndStats(filters),
      this.queryLeaderboard(leaderboardFilters),
      this.queryTrend(filters, granularity),
      this.queryStatsFromFilters(prevFilters),
    ]);

    const { funnel, stats } = funnelAndStats;

    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      funnel,
      stats: {
        ...stats,
        fromDate: window.fromDate,
        toDate: window.toDate,
        trendVsPreviousPeriod: {
          totalPipelineValue: computeTrendMetric(
            stats.totalPipelineValue,
            prevStats.totalPipelineValue,
          ),
          avgDealSize: computeTrendMetric(stats.avgDealSize, prevStats.avgDealSize),
          winRate: computeTrendMetric(stats.winRate, prevStats.winRate),
          avgSalesCycleDays: computeTrendMetric(
            stats.avgSalesCycleDays,
            prevStats.avgSalesCycleDays,
          ),
        },
      },
      leaderboard,
      trend: { granularity, points: trend.points },
    };
  }

  async getFunnel(
    fromDate?: string,
    toDate?: string,
    salesPersonId?: string,
  ): Promise<SalesPipelineFunnelResponseDto> {
    const window = resolveStatsWindow(fromDate, toDate);
    const filters = this.buildFilters(
      window.fromDate,
      window.toDate,
      salesPersonId,
    );
    const { funnel } = await this.queryFunnelAndStats(filters);
    return { fromDate: window.fromDate, toDate: window.toDate, ...funnel };
  }

  async getStats(
    fromDate?: string,
    toDate?: string,
    salesPersonId?: string,
  ): Promise<SalesPipelineStatsResponseDto> {
    const window = resolveStatsWindow(fromDate, toDate);
    const filters = this.buildFilters(
      window.fromDate,
      window.toDate,
      salesPersonId,
    );
    const prevWindow = computePreviousWindow(window.fromDate, window.toDate);
    const prevFilters = this.buildFilters(
      prevWindow.fromDate,
      prevWindow.toDate,
      salesPersonId,
    );

    const [current, previous] = await Promise.all([
      this.queryStatsFromFilters(filters),
      this.queryStatsFromFilters(prevFilters),
    ]);

    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      ...current,
      trendVsPreviousPeriod: {
        totalPipelineValue: computeTrendMetric(
          current.totalPipelineValue,
          previous.totalPipelineValue,
        ),
        avgDealSize: computeTrendMetric(current.avgDealSize, previous.avgDealSize),
        winRate: computeTrendMetric(current.winRate, previous.winRate),
        avgSalesCycleDays: computeTrendMetric(
          current.avgSalesCycleDays,
          previous.avgSalesCycleDays,
        ),
      },
    };
  }

  async getLeaderboard(
    fromDate?: string,
    toDate?: string,
  ): Promise<SalesPipelineLeaderboardResponseDto> {
    const window = resolveStatsWindow(fromDate, toDate);
    const filters = this.buildFilters(window.fromDate, window.toDate);
    const leaderboard = await this.queryLeaderboard(filters);
    return { fromDate: window.fromDate, toDate: window.toDate, entries: leaderboard.entries };
  }

  async getTrend(
    fromDate?: string,
    toDate?: string,
    granularity: 'week' | 'month' = 'week',
    salesPersonId?: string,
  ): Promise<SalesPipelineTrendResponseDto> {
    const window = resolveStatsWindow(fromDate, toDate);
    const filters = this.buildFilters(
      window.fromDate,
      window.toDate,
      salesPersonId,
    );
    const trend = await this.queryTrend(filters, granularity);
    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      granularity,
      points: trend.points,
    };
  }

  private buildFilters(
    fromDate: string,
    toDate: string,
    salesPersonId?: string,
  ): SalesPipelineFilterParams {
    return { fromDate, toDate, salesPersonId };
  }

  private async queryFunnelAndStats(filters: SalesPipelineFilterParams): Promise<{
    funnel: Pick<SalesPipelineFunnelResponseDto, 'stages' | 'lostCount' | 'lostValue'>;
    stats: Pick<
      SalesPipelineStatsResponseDto,
      'totalPipelineValue' | 'avgDealSize' | 'winRate' | 'avgSalesCycleDays'
    >;
  }> {
    const parts = buildCohortCte(filters);
    const [row] = await this.dataSource.query<FunnelAndStatsAggRow[]>(
      buildFunnelAndStatsAggregationSql(parts),
      parts.params,
    );
    if (!row) {
      return {
        funnel: { stages: [], lostCount: 0, lostValue: 0 },
        stats: { totalPipelineValue: 0, avgDealSize: 0, winRate: 0, avgSalesCycleDays: 0 },
      };
    }

    return {
      funnel: this.mapFunnelFromRow(row),
      stats: this.mapStatsFromRow(row),
    };
  }

  private async queryStatsFromFilters(
    filters: SalesPipelineFilterParams,
  ): Promise<
    Pick<
      SalesPipelineStatsResponseDto,
      'totalPipelineValue' | 'avgDealSize' | 'winRate' | 'avgSalesCycleDays'
    >
  > {
    const { stats } = await this.queryFunnelAndStats(filters);
    return stats;
  }

  private mapFunnelFromRow(
    row: FunnelAndStatsAggRow,
  ): Pick<SalesPipelineFunnelResponseDto, 'stages' | 'lostCount' | 'lostValue'> {
    const stageCounts = [
      {
        id: SALES_PIPELINE_STAGE_IDS.LEADS,
        count: row.leads_count,
        value: parseNumericValue(row.leads_value),
      },
      {
        id: SALES_PIPELINE_STAGE_IDS.QUALIFIED,
        count: row.qualified_count,
        value: parseNumericValue(row.qualified_value),
      },
      {
        id: SALES_PIPELINE_STAGE_IDS.QUOTED,
        count: row.quoted_count,
        value: parseNumericValue(row.quoted_value),
      },
      {
        id: SALES_PIPELINE_STAGE_IDS.WON,
        count: row.won_count,
        value: parseNumericValue(row.won_value),
      },
    ];

    let prevCount = 0;
    const stages = stageCounts.map((stage, index) => {
      const conversionRateFromPrevious =
        index === 0 ? null : computeConversionRate(stage.count, prevCount);
      prevCount = stage.count;

      const base = {
        id: stage.id,
        label: SALES_PIPELINE_STAGE_LABELS[stage.id],
        count: stage.count,
        value: stage.value,
        conversionRateFromPrevious,
      };

      if (stage.id === SALES_PIPELINE_STAGE_IDS.QUOTED) {
        return {
          ...base,
          negotiationCount: row.negotiation_count,
          negotiationValue: parseNumericValue(row.negotiation_value),
        };
      }
      return base;
    });

    return {
      stages,
      lostCount: row.lost_count,
      lostValue: parseNumericValue(row.lost_value),
    };
  }

  private mapStatsFromRow(
    row: FunnelAndStatsAggRow,
  ): Pick<
    SalesPipelineStatsResponseDto,
    'totalPipelineValue' | 'avgDealSize' | 'winRate' | 'avgSalesCycleDays'
  > {
    const decidedCount = row.stats_won_count + row.stats_lost_count;
    const winRate =
      decidedCount > 0 ? Math.round((row.stats_won_count / decidedCount) * 1000) / 10 : 0;

    return {
      totalPipelineValue: Math.round(parseNumericValue(row.total_pipeline_value)),
      avgDealSize: Math.round(parseNumericValue(row.avg_deal_size)),
      winRate,
      avgSalesCycleDays: Math.round(parseNumericValue(row.avg_sales_cycle_days)),
    };
  }

  private async queryLeaderboard(
    filters: SalesPipelineFilterParams,
  ): Promise<Pick<SalesPipelineLeaderboardResponseDto, 'entries'>> {
    const parts = buildCohortCte(filters);
    const rows = await this.dataSource.query<LeaderboardAggRow[]>(
      buildLeaderboardSql(parts),
      parts.params,
    );
    const userNames = await this.fetchOrgUserNames();

    const entries: SalesPipelineLeaderboardEntryDto[] = rows.map((row) => {
      const isUnassigned = row.sales_person_id === null;
      const decidedCount = row.won_count + row.lost_count;
      const winRate = decidedCount > 0 ? Math.round((row.won_count / decidedCount) * 1000) / 10 : 0;

      return {
        salesPersonId: row.sales_person_id,
        salesPersonName: isUnassigned
          ? 'Unassigned'
          : (userNames.get(row.sales_person_id!) ?? 'Unknown User'),
        propertyCount: row.property_count,
        pipelineValue: Math.round(parseNumericValue(row.pipeline_value)),
        wonCount: row.won_count,
        winRate,
        isUnassigned,
      };
    });

    return { entries };
  }

  private async queryTrend(
    filters: SalesPipelineFilterParams,
    granularity: 'week' | 'month',
  ): Promise<Pick<SalesPipelineTrendResponseDto, 'points'>> {
    const parts = buildCohortCte(filters);
    const rows = await this.dataSource.query<TrendAggRow[]>(
      buildTrendSql(parts, granularity),
      parts.params,
    );
    return {
      points: rows.map((r) => ({
        period: r.period,
        leadsCount: r.leads_count,
        wonCount: r.won_count,
      })),
    };
  }

  private async fetchOrgUserNames(): Promise<Map<string, string>> {
    const rows = await this.dataSource.query<
      Array<{ user_id: string; first_name: string; last_name: string | null }>
    >(
      `
      SELECT DISTINCT u.id AS user_id, u.first_name, u.last_name
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      `,
      [],
    );
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.user_id, [row.first_name, row.last_name].filter(Boolean).join(' '));
    }
    return map;
  }
}
