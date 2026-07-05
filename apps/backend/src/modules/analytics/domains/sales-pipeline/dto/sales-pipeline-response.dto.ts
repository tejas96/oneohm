import type { AnalyticsTrendMetric } from '../../../common/dto/trend-metric.dto';

export interface SalesPipelineFunnelStageDto {
  id: string;
  label: string;
  count: number;
  value: number;
  conversionRateFromPrevious: number | null;
  negotiationCount?: number;
  negotiationValue?: number;
}

export interface SalesPipelineFunnelResponseDto {
  fromDate: string;
  toDate: string;
  stages: SalesPipelineFunnelStageDto[];
  lostCount: number;
  lostValue: number;
}

export type SalesPipelineTrendMetricDto = AnalyticsTrendMetric;

export interface SalesPipelineStatsResponseDto {
  fromDate: string;
  toDate: string;
  totalPipelineValue: number;
  avgDealSize: number;
  winRate: number;
  avgSalesCycleDays: number;
  trendVsPreviousPeriod: {
    totalPipelineValue: SalesPipelineTrendMetricDto;
    avgDealSize: SalesPipelineTrendMetricDto;
    winRate: SalesPipelineTrendMetricDto;
    avgSalesCycleDays: SalesPipelineTrendMetricDto;
  };
}

export interface SalesPipelineLeaderboardEntryDto {
  salesPersonId: string | null;
  salesPersonName: string;
  propertyCount: number;
  pipelineValue: number;
  wonCount: number;
  winRate: number;
  isUnassigned: boolean;
}

export interface SalesPipelineLeaderboardResponseDto {
  fromDate: string;
  toDate: string;
  entries: SalesPipelineLeaderboardEntryDto[];
}

export interface SalesPipelineTrendPointDto {
  period: string;
  leadsCount: number;
  wonCount: number;
}

export interface SalesPipelineTrendResponseDto {
  fromDate: string;
  toDate: string;
  granularity: 'week' | 'month';
  points: SalesPipelineTrendPointDto[];
}

export interface SalesPipelineDashboardResponseDto {
  fromDate: string;
  toDate: string;
  funnel: Pick<SalesPipelineFunnelResponseDto, 'stages' | 'lostCount' | 'lostValue'>;
  stats: SalesPipelineStatsResponseDto;
  leaderboard: Pick<SalesPipelineLeaderboardResponseDto, 'entries'>;
  trend: Pick<SalesPipelineTrendResponseDto, 'granularity' | 'points'>;
}
