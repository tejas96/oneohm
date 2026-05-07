'use client';

import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Alert, IconButton, Tooltip } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { CashFlowChart } from '../dashboard/cash-flow-chart';
import { FinanceKpiStrip } from '../dashboard/kpi-strip';
import { RecentActivityFeed } from '../dashboard/recent-activity-feed';
import { SpeedDialActions } from '../dashboard/speed-dial-actions';
import { SpendByCategoryDonut } from '../dashboard/spend-by-category-donut';
import { TopCustomersOutstanding } from '../dashboard/top-customers-outstanding';
import { TopVendorsSpend } from '../dashboard/top-vendors-spend';
import { DateRangePicker, type DateRangeValue, resolveFyPresetRange } from '../shared';

import { ErrorState } from '@/components/shared';
import { MUITypography } from '@/components/ui';
import { useOrgFinanceDashboard } from '@/lib/hooks/resources';

/**
 * Finance dashboard orchestrator.
 *
 * Single API round-trip — `useOrgFinanceDashboard(range)` returns
 * everything the page renders. The DateRangePicker writes its preset /
 * fromDate / toDate to URL search params so the range survives reloads
 * and is shareable; we read the same params back here.
 *
 * Layout (lg+):
 *   row 1: 6 KPI tiles
 *   row 2: cash-flow chart (2 cols) + spend donut (1 col)
 *   row 3: top customers (1 col) + top vendors (1 col) + activity (1 col)
 *
 * On md it collapses to 2 columns, then 1 on sm.
 *
 * Permissions: open to all authenticated users in V1 (per Q&A). The
 * banner under the title surfaces the two key V1 caveats — no perm
 * gating + free-text vendor matching — so finance leads aren't
 * surprised by what they see.
 */
export function FinanceDashboard(): React.JSX.Element {
  const searchParams = useSearchParams();

  const initialRange: DateRangeValue = React.useMemo(() => {
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    if (from || to) return { from, to };
    return resolveFyPresetRange('this-month') ?? {};
  }, [searchParams]);

  const [range, setRange] = React.useState<DateRangeValue>(initialRange);

  const dashboardQuery = useOrgFinanceDashboard({ from: range.from, to: range.to });

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <MUITypography variant="drawerTitle">Finance Dashboard</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            Executive view of receipts, spend, outstanding receivables, and recent activity.
          </MUITypography>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <Tooltip title="Refresh dashboard data" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  void dashboardQuery.refetch();
                }}
                disabled={dashboardQuery.isFetching}
              >
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </header>

      <Alert
        severity="info"
        variant="outlined"
        sx={{ borderRadius: 2, py: 0.5, '& .MuiAlert-message': { fontSize: 12 } }}
      >
        V1 caveats: open to all authenticated users (no permission gating yet); vendor matching is
        by case-insensitive name (no vendor-master FK).
      </Alert>

      {dashboardQuery.isError ? (
        <ErrorState
          title="Couldn't load the finance dashboard"
          description={dashboardQuery.error?.message ?? 'Unknown error'}
          onRetry={() => {
            void dashboardQuery.refetch();
          }}
        />
      ) : (
        <>
          <FinanceKpiStrip kpis={dashboardQuery.data?.kpis} isLoading={dashboardQuery.isLoading} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CashFlowChart
                points={dashboardQuery.data?.cashFlowMonthly ?? []}
                isLoading={dashboardQuery.isLoading}
              />
            </div>
            <SpendByCategoryDonut
              data={dashboardQuery.data?.spendByCategory ?? []}
              isLoading={dashboardQuery.isLoading}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TopCustomersOutstanding
              data={dashboardQuery.data?.topCustomersOutstanding ?? []}
              isLoading={dashboardQuery.isLoading}
            />
            <TopVendorsSpend
              data={dashboardQuery.data?.topVendorsSpend ?? []}
              isLoading={dashboardQuery.isLoading}
            />
            <RecentActivityFeed
              items={dashboardQuery.data?.recentActivity ?? []}
              isLoading={dashboardQuery.isLoading}
            />
          </section>
        </>
      )}

      <SpeedDialActions />
    </div>
  );
}
