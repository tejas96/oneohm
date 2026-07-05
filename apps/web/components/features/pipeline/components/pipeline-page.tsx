'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { PipelineFiltersBar } from './pipeline-filters-bar';
import { PipelineStatsCards } from './pipeline-stats-cards';
import { PipelineTrendChart } from './pipeline-trend-chart';
import { SalesFunnelChart } from './sales-funnel-chart';
import { SalespersonLeaderboard } from './salesperson-leaderboard';
import { StageConversionPanel } from './stage-conversion-panel';
import { PIPELINE_DEFAULT_RANGE, PIPELINE_SALESPERSON_ALL } from '../constants';

import {
  resolveStatsWindow,
  usePipelineDashboard,
  type StatsWindowInput,
} from '@/lib/hooks/resources';

function buildStatsWindow(searchParams: URLSearchParams): StatsWindowInput {
  return {
    range: searchParams.get('range') ?? PIPELINE_DEFAULT_RANGE,
    fromDate: searchParams.get('fromDate') ?? undefined,
    toDate: searchParams.get('toDate') ?? undefined,
  };
}

export function PipelinePage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const statsWindow = React.useMemo(() => buildStatsWindow(searchParams), [searchParams]);
  const isWindowReady = React.useMemo(
    () => resolveStatsWindow(statsWindow) !== null,
    [statsWindow],
  );

  const salesPersonParam = searchParams.get('salesPersonId');
  const salesPersonId =
    salesPersonParam && salesPersonParam !== PIPELINE_SALESPERSON_ALL
      ? salesPersonParam
      : undefined;

  const queryOpts = React.useMemo(
    () => ({ window: statsWindow, salesPersonId }),
    [statsWindow, salesPersonId],
  );

  const dashboardQuery = usePipelineDashboard(queryOpts);

  const showLoading = !isWindowReady || dashboardQuery.isLoading;
  const dashboard = isWindowReady ? dashboardQuery.data : undefined;

  const funnel = dashboard?.funnel;
  const stats = dashboard?.stats;
  const leaderboard = dashboard?.leaderboard;
  const trend = dashboard?.trend;

  const refetch = (): void => {
    void dashboardQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <PipelineFiltersBar />

      <PipelineStatsCards
        stats={stats}
        isLoading={showLoading}
        isError={isWindowReady && dashboardQuery.isError}
        onRetry={refetch}
      />

      <SalesFunnelChart
        stages={funnel?.stages ?? []}
        totalPipelineValue={stats?.totalPipelineValue}
        lostCount={funnel?.lostCount ?? 0}
        lostValue={funnel?.lostValue ?? 0}
        isLoading={showLoading}
        isError={isWindowReady && dashboardQuery.isError}
        onRetry={refetch}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StageConversionPanel stages={funnel?.stages ?? []} isLoading={showLoading} />
        <SalespersonLeaderboard
          entries={leaderboard?.entries ?? []}
          isLoading={showLoading}
          isError={isWindowReady && dashboardQuery.isError}
          onRetry={refetch}
        />
      </div>

      <PipelineTrendChart
        points={trend?.points ?? []}
        isLoading={showLoading}
        isError={isWindowReady && dashboardQuery.isError}
        onRetry={refetch}
      />
    </div>
  );
}
